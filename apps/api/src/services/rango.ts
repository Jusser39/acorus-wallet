import type { RangoSwapQuoteResponse } from "@acorus/shared";
import type { ApiEnv } from "../env";
import {
  createRateLimiter,
  isAbortError,
  normalizeRecord,
  readString,
  safeProviderMessage,
  SwapProviderError,
} from "./swap-errors";

export type RangoQuoteQuery = {
  from: string;
  to: string;
  amount: string;
  fromAddress?: string;
  toAddress?: string;
  slippageBps?: number;
};

export type RangoSwapStatus = {
  ok: true;
  provider: "rango";
  configured: boolean;
  enabled: boolean;
  apiBase: string;
  supportedFamilies: ["evm", "solana", "tron", "utxo", "ton"];
  supportedChains: ["crosschain"];
};

const POSITIVE_DECIMAL = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/u;

export function createRangoSwapService(env: ApiEnv) {
  return new RangoSwapService(env);
}

export class RangoSwapService {
  private readonly throttle: (clientKey: string) => void;

  constructor(private readonly env: ApiEnv) {
    this.throttle = createRateLimiter(env.RANGO_RATE_LIMIT_PER_MINUTE);
  }

  getStatus(): RangoSwapStatus {
    return {
      ok: true,
      provider: "rango",
      configured: this.isConfigured(),
      enabled: this.env.RANGO_ENABLED,
      apiBase: this.env.RANGO_API_BASE,
      supportedFamilies: ["evm", "solana", "tron", "utxo", "ton"],
      supportedChains: ["crosschain"],
    };
  }

  async getQuote(input: RangoQuoteQuery, clientKey = "default"): Promise<RangoSwapQuoteResponse> {
    this.assertReady(clientKey);
    const query = normalizeRangoQuery(input);
    const payload = await this.fetchRango("/basic/quote", query);
    return mapRangoResponse(payload, query, "quote");
  }

  async getSwap(input: RangoQuoteQuery, clientKey = "default"): Promise<RangoSwapQuoteResponse> {
    this.assertReady(clientKey);
    const query = normalizeRangoQuery(input);
    const payload = await this.fetchRango("/basic/swap", query);
    return mapRangoResponse(payload, query, "swap");
  }

  private isConfigured(): boolean {
    return Boolean(this.env.RANGO_API_KEY);
  }

  private assertReady(clientKey: string): void {
    if (!this.env.RANGO_ENABLED) {
      throw new SwapProviderError(
        503,
        "swap_provider_not_configured",
        "Rango swap provider is not enabled.",
      );
    }

    this.throttle(clientKey);
  }

  private async fetchRango(
    path: string,
    query: NormalizedRangoQuery,
  ): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8_000);
    const search = new URLSearchParams({
      apiKey: this.env.RANGO_API_KEY || "c6381a79-2817-4602-83bf-6a641a409e32",
      from: query.from,
      to: query.to,
      amount: query.amount,
      slippage: String(query.slippageBps / 100),
    });

    if (query.fromAddress) {
      search.set("fromAddress", query.fromAddress);
    }

    if (query.toAddress) {
      search.set("toAddress", query.toAddress);
    }

    try {
      const response = await fetch(
        `${this.env.RANGO_API_BASE.replace(/\/$/u, "")}${path}?${search.toString()}`,
        {
          method: "GET",
          signal: controller.signal,
          headers: {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        },
      );
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;

      if (!response.ok || readString(payload.error)) {
        throw new SwapProviderError(
          response.status >= 500 ? 502 : response.status,
          response.status === 400 ? "swap_bad_request" : "swap_provider_error",
          safeProviderMessage(payload, "Rango rejected the swap request."),
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof SwapProviderError) {
        throw error;
      }

      if (isAbortError(error)) {
        throw new SwapProviderError(504, "swap_provider_timeout", "Rango swap provider timed out.");
      }

      throw new SwapProviderError(
        502,
        "swap_provider_error",
        error instanceof Error ? error.message : "Rango swap provider failed.",
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

type NormalizedRangoQuery = {
  from: string;
  to: string;
  amount: string;
  fromAddress?: string;
  toAddress?: string;
  slippageBps: number;
};

function normalizeRangoQuery(input: RangoQuoteQuery): NormalizedRangoQuery {
  if (!input.from.trim() || !input.to.trim()) {
    throw new SwapProviderError(400, "swap_bad_request", "Rango from/to asset identifiers are required.");
  }

  if (input.from.trim() === input.to.trim()) {
    throw new SwapProviderError(400, "swap_bad_request", "Choose different Rango assets.");
  }

  if (!POSITIVE_DECIMAL.test(input.amount) || Number(input.amount) <= 0) {
    throw new SwapProviderError(400, "swap_bad_request", "Amount must be a positive decimal string.");
  }

  return {
    from: input.from.trim(),
    to: input.to.trim(),
    amount: input.amount.trim(),
    fromAddress: input.fromAddress?.trim(),
    toAddress: input.toAddress?.trim(),
    slippageBps: input.slippageBps ?? 50,
  };
}

function mapRangoResponse(
  payload: Record<string, unknown>,
  query: NormalizedRangoQuery,
  mode: "quote" | "swap",
): RangoSwapQuoteResponse {
  const route = Array.isArray(payload.route) ? payload.route : [];
  const tx = normalizeRecord(payload.tx);
  const result = normalizeRecord(payload.result);

  return {
    ok: true,
    provider: "rango",
    mode,
    requestId: readString(payload.requestId) ?? `rango_${Date.now()}`,
    from: query.from,
    to: query.to,
    amountRaw: query.amount,
    outputAmountRaw: readString(payload.outputAmount) ?? readString(result.outputAmount),
    outputAmountFormatted: readString(payload.outputAmountHumanReadable) ?? readString(result.outputAmountHumanReadable),
    routeLabel: buildRouteLabel(route),
    routeSummary: route
      .map((item) => normalizeRecord(item))
      .map((item) => ({
        swapper: readString(item.swapperId) ?? readString(item.swapper),
        from: readString(item.fromBlockchain) ?? readString(item.from),
        to: readString(item.toBlockchain) ?? readString(item.to),
      }))
      .slice(0, 8),
    resultType: readString(payload.resultType),
    warnings: buildRangoWarnings(payload),
    tx: Object.keys(tx).length
      ? {
          type: readString(tx.type),
          from: readString(tx.from),
          to: readString(tx.to),
          data: readString(tx.data),
          value: readString(tx.value),
          gasLimit: readString(tx.gasLimit),
        }
      : null,
    expiresAt: new Date(Date.now() + 45_000).toISOString(),
  };
}

function buildRouteLabel(route: unknown[]): string {
  const labels = route
    .map((item) => normalizeRecord(item))
    .map((item) => readString(item.swapperId) ?? readString(item.swapper))
    .filter((item): item is string => Boolean(item));

  return labels.length ? labels.join(" + ") : "Rango best route";
}

function buildRangoWarnings(payload: Record<string, unknown>): string[] {
  const warnings: string[] = [];
  const warning = readString(payload.warning);

  if (warning) {
    warnings.push(warning);
  }

  if (readString(payload.resultType)?.toLowerCase() === "warning") {
    warnings.push("Rango returned a warning for this route.");
  }

  return warnings;
}

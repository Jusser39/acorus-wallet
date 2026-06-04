import type {
  SolanaSwapQuoteResponse,
  SolanaSwapTransactionDraftResponse,
  SwapRouteStep,
} from "@acorus/shared";
import type { ApiEnv } from "../env";
import {
  createRateLimiter,
  isAbortError,
  normalizeRecord,
  readNumber,
  readString,
  safeProviderMessage,
  SwapProviderError,
} from "./swap-errors";

export type JupiterQuoteQuery = {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
};

export type JupiterSwapQuery = JupiterQuoteQuery & {
  userPublicKey: string;
};

export type JupiterSwapStatus = {
  ok: true;
  provider: "jupiter";
  configured: boolean;
  enabled: boolean;
  apiBase: string;
  supportedFamilies: ["solana"];
  supportedChains: [101];
};

const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,45}$/u;
const POSITIVE_INTEGER = /^[1-9][0-9]*$/u;

export function createJupiterSwapService(env: ApiEnv) {
  return new JupiterSwapService(env);
}

export class JupiterSwapService {
  private readonly throttle: (clientKey: string) => void;

  constructor(private readonly env: ApiEnv) {
    this.throttle = createRateLimiter(env.JUPITER_RATE_LIMIT_PER_MINUTE);
  }

  getStatus(): JupiterSwapStatus {
    return {
      ok: true,
      provider: "jupiter",
      configured: this.isConfigured(),
      enabled: this.env.JUPITER_ENABLED,
      apiBase: this.env.JUPITER_API_BASE,
      supportedFamilies: ["solana"],
      supportedChains: [101],
    };
  }

  async getQuote(input: JupiterQuoteQuery, clientKey = "default"): Promise<SolanaSwapQuoteResponse> {
    this.assertReady(clientKey);
    const query = normalizeJupiterQuote(input);
    const payload = await this.fetchJupiter("quote", query);
    return mapJupiterQuote(payload, query, "quote");
  }

  async getSwapTransaction(
    input: JupiterSwapQuery,
    clientKey = "default",
  ): Promise<SolanaSwapTransactionDraftResponse> {
    this.assertReady(clientKey);
    const query = normalizeJupiterSwap(input);
    const quote = await this.fetchJupiter("quote", query);
    const swap = await this.fetchJupiterSwap(quote, query.userPublicKey);
    return {
      ...mapJupiterQuote(quote, query, "swap"),
      mode: "swap",
      userPublicKey: query.userPublicKey,
      swapTransaction: readString(swap.swapTransaction) ?? "",
      lastValidBlockHeight: readNumber(swap.lastValidBlockHeight),
    };
  }

  private isConfigured(): boolean {
    return Boolean(this.env.JUPITER_ENABLED);
  }

  private assertReady(clientKey: string): void {
    if (!this.env.JUPITER_ENABLED) {
      throw new SwapProviderError(
        503,
        "swap_provider_not_configured",
        "Jupiter swap provider is not configured.",
      );
    }

    this.throttle(clientKey);
  }

  private async fetchJupiter(
    mode: "quote",
    query: NormalizedJupiterQuote,
  ): Promise<Record<string, unknown>> {
    const search = new URLSearchParams({
      inputMint: query.inputMint,
      outputMint: query.outputMint,
      amount: query.amount,
      slippageBps: String(query.slippageBps),
      restrictIntermediateTokens: "true",
    });
    return this.fetchJson(`/swap/v1/${mode}?${search.toString()}`, "GET");
  }

  private async fetchJupiterSwap(
    quoteResponse: Record<string, unknown>,
    userPublicKey: string,
  ): Promise<Record<string, unknown>> {
    return this.fetchJson("/swap/v1/swap", "POST", {
      quoteResponse,
      userPublicKey,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: {
          maxLamports: 1_000_000,
          priorityLevel: "high",
        },
      },
    });
  }

  private async fetchJson(
    path: string,
    method: "GET" | "POST",
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8_000);

    try {
      const response = await fetch(`${this.env.JUPITER_API_BASE.replace(/\/$/u, "")}${path}`, {
        method,
        headers: {
          "content-type": "application/json",
          "x-api-key": this.env.JUPITER_API_KEY ?? "",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;

      if (!response.ok) {
        throw new SwapProviderError(
          response.status >= 500 ? 502 : response.status,
          response.status === 400 ? "swap_bad_request" : "swap_provider_error",
          safeProviderMessage(payload, "Jupiter rejected the swap request."),
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof SwapProviderError) {
        throw error;
      }

      if (isAbortError(error)) {
        throw new SwapProviderError(504, "swap_provider_timeout", "Jupiter swap provider timed out.");
      }

      throw new SwapProviderError(
        502,
        "swap_provider_error",
        error instanceof Error ? error.message : "Jupiter swap provider failed.",
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

type NormalizedJupiterQuote = {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps: number;
};

type NormalizedJupiterSwap = NormalizedJupiterQuote & {
  userPublicKey: string;
};

function normalizeJupiterQuote(input: JupiterQuoteQuery): NormalizedJupiterQuote {
  if (!BASE58_ADDRESS.test(input.inputMint) || !BASE58_ADDRESS.test(input.outputMint)) {
    throw new SwapProviderError(400, "swap_bad_request", "Solana token mint is invalid.");
  }

  if (input.inputMint === input.outputMint) {
    throw new SwapProviderError(400, "swap_bad_request", "Choose different Solana tokens.");
  }

  if (!POSITIVE_INTEGER.test(input.amount)) {
    throw new SwapProviderError(400, "swap_bad_request", "Amount must be a positive raw integer.");
  }

  return {
    inputMint: input.inputMint,
    outputMint: input.outputMint,
    amount: input.amount,
    slippageBps: input.slippageBps ?? 50,
  };
}

function normalizeJupiterSwap(input: JupiterSwapQuery): NormalizedJupiterSwap {
  const quote = normalizeJupiterQuote(input);

  if (!BASE58_ADDRESS.test(input.userPublicKey)) {
    throw new SwapProviderError(400, "swap_bad_request", "Solana user public key is invalid.");
  }

  return {
    ...quote,
    userPublicKey: input.userPublicKey,
  };
}

function mapJupiterQuote(
  payload: Record<string, unknown>,
  query: NormalizedJupiterQuote,
  mode: "quote" | "swap",
): SolanaSwapQuoteResponse {
  const routes = Array.isArray(payload.routePlan) ? payload.routePlan : [];

  return {
    ok: true,
    provider: "jupiter",
    mode,
    inputMint: readString(payload.inputMint) ?? query.inputMint,
    outputMint: readString(payload.outputMint) ?? query.outputMint,
    inAmountRaw: readString(payload.inAmount) ?? query.amount,
    outAmountRaw: readString(payload.outAmount) ?? "0",
    otherAmountThresholdRaw: readString(payload.otherAmountThreshold),
    slippageBps: query.slippageBps,
    priceImpactPct: readString(payload.priceImpactPct),
    routeSummary: routes.map(mapJupiterRouteStep).filter((item): item is SwapRouteStep => Boolean(item)).slice(0, 8),
    warnings: buildJupiterWarnings(payload),
    rawSafeSubset: {
      contextSlot: readNumber(payload.contextSlot),
      timeTaken: readNumber(payload.timeTaken),
    },
    expiresAt: new Date(Date.now() + 30_000).toISOString(),
  };
}

function mapJupiterRouteStep(value: unknown): SwapRouteStep | null {
  const record = normalizeRecord(value);
  const swapInfo = normalizeRecord(record.swapInfo);
  const inputMint = readString(swapInfo.inputMint);
  const outputMint = readString(swapInfo.outputMint);

  if (!inputMint || !outputMint) {
    return null;
  }

  return {
    provider: "jupiter",
    family: "solana",
    chainId: 101,
    fromAsset: {
      family: "solana",
      chainId: 101,
      type: "spl",
      symbol: inputMint.slice(0, 4),
      name: inputMint,
      decimals: 0,
      tokenAddress: inputMint,
    },
    toAsset: {
      family: "solana",
      chainId: 101,
      type: "spl",
      symbol: outputMint.slice(0, 4),
      name: outputMint,
      decimals: 0,
      tokenAddress: outputMint,
    },
    fromAmountRaw: readString(swapInfo.inAmount) ?? "0",
    toAmountRaw: readString(swapInfo.outAmount) ?? "0",
    protocolName: readString(swapInfo.label) ?? "Jupiter route",
  };
}

function buildJupiterWarnings(payload: Record<string, unknown>): string[] {
  const warnings: string[] = [];
  const priceImpact = Number(readString(payload.priceImpactPct) ?? "0");

  if (Number.isFinite(priceImpact) && priceImpact > 0.05) {
    warnings.push("High price impact route.");
  }

  return warnings;
}

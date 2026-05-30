import type { ApiEnv } from "../env";

export type LiFiQuery = {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  toAddress?: string;
  slippage?: number;
};

export type LiFiStatusQuery = {
  txHash: string;
  bridge?: string;
  fromChain?: number;
  toChain?: number;
};

export class LiFiSwapError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export type LiFiTokenInfo = {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  chainId: number;
  logoURI?: string | null;
};

export type LiFiSwapStatus = {
  ok: true;
  provider: "lifi";
  configured: boolean;
  enabled: boolean;
  apiBase: string;
};

export type LiFiQuoteResponse = {
  provider: "lifi";
  requestId: string;
  createdAt: string;
  tool: string;
  toolName: string;
  fromChainId: number;
  toChainId: number;
  fromToken: LiFiTokenInfo;
  toToken: LiFiTokenInfo;
  fromAmountRaw: string;
  toAmountRaw: string;
  toAmountMinRaw: string;
  estimatedDurationSec: number;
  fromAmountUSD?: string | null;
  toAmountUSD?: string | null;
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gasPrice?: string | null;
    gasLimit?: string | null;
    chainId: number;
  };
  approvalRequired: boolean;
  approvalAddress?: string | null;
  warnings: string[];
  expiresAt: string;
};

export type LiFiTxStatusResponse = {
  provider: "lifi";
  txHash: string;
  status: "NOT_FOUND" | "PENDING" | "DONE" | "FAILED" | "INVALID" | "UNKNOWN";
  substatus?: string | null;
  substatusMessage?: string | null;
  fromChainId?: number | null;
  toChainId?: number | null;
  bridge?: string | null;
  receivingTx?: string | null;
};

const HEX_ADDRESS = /^0x[a-fA-F0-9]{40}$/u;
const POSITIVE_INTEGER = /^[1-9][0-9]*$/u;
const LIFI_NATIVE_ADDRS = new Set([
  "0x0000000000000000000000000000000000000000",
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
]);

export function createLiFiSwapService(env: ApiEnv) {
  return new LiFiSwapService(env);
}

export class LiFiSwapService {
  private readonly requestTimestamps = new Map<string, number[]>();

  constructor(private readonly env: ApiEnv) {}

  getStatus(): LiFiSwapStatus {
    return {
      ok: true,
      provider: "lifi",
      configured: this.env.LIFI_ENABLED,
      enabled: this.env.LIFI_ENABLED,
      apiBase: this.env.LIFI_API_BASE,
    };
  }

  async getQuote(input: LiFiQuery, clientKey = "default"): Promise<LiFiQuoteResponse> {
    this.assertReady(clientKey);
    this.validateQuoteInput(input);

    const search = new URLSearchParams({
      fromChain: String(input.fromChain),
      toChain: String(input.toChain),
      fromToken: input.fromToken,
      toToken: input.toToken,
      fromAmount: input.fromAmount,
      fromAddress: input.fromAddress,
      slippage: String(input.slippage ?? 0.005),
    });

    if (input.toAddress) {
      search.set("toAddress", input.toAddress);
    }

    if (this.env.LIFI_AFFILIATE_ADDRESS) {
      search.set("referrer", this.env.LIFI_AFFILIATE_ADDRESS);
    }

    if (this.env.LIFI_REFERRER_FEE_BPS !== undefined && this.env.LIFI_REFERRER_FEE_BPS > 0) {
      search.set("fee", String(this.env.LIFI_REFERRER_FEE_BPS / 10000));
    }

    const payload = await this.fetchLiFi(`quote?${search.toString()}`);
    return this.mapQuoteResponse(payload, input);
  }

  async getTxStatus(input: LiFiStatusQuery): Promise<LiFiTxStatusResponse> {
    if (!input.txHash || !/^0x[a-fA-F0-9]{64}$/u.test(input.txHash)) {
      throw new LiFiSwapError(400, "lifi_bad_request", "Invalid transaction hash.");
    }

    const search = new URLSearchParams({ txHash: input.txHash });

    if (input.bridge) {
      search.set("bridge", input.bridge);
    }

    if (input.fromChain !== undefined) {
      search.set("fromChain", String(input.fromChain));
    }

    if (input.toChain !== undefined) {
      search.set("toChain", String(input.toChain));
    }

    const payload = await this.fetchLiFi(`status?${search.toString()}`);
    return this.mapTxStatusResponse(payload, input.txHash);
  }

  private assertReady(clientKey: string): void {
    if (!this.env.LIFI_ENABLED) {
      throw new LiFiSwapError(503, "swap_provider_not_configured", "LI.FI cross-chain swap is not enabled.");
    }

    this.applyThrottle(clientKey);
  }

  private applyThrottle(clientKey: string): void {
    const now = Date.now();
    const windowStart = now - 60_000;
    const current = (this.requestTimestamps.get(clientKey) ?? []).filter((ts) => ts > windowStart);

    if (current.length >= this.env.LIFI_RATE_LIMIT_PER_MINUTE) {
      throw new LiFiSwapError(429, "swap_rate_limited", "Too many LI.FI swap requests.");
    }

    current.push(now);
    this.requestTimestamps.set(clientKey, current);
  }

  private validateQuoteInput(input: LiFiQuery): void {
    if (!Number.isInteger(input.fromChain) || input.fromChain <= 0) {
      throw new LiFiSwapError(400, "lifi_bad_request", "Invalid fromChain.");
    }

    if (!Number.isInteger(input.toChain) || input.toChain <= 0) {
      throw new LiFiSwapError(400, "lifi_bad_request", "Invalid toChain.");
    }

    if (!input.fromToken?.trim()) {
      throw new LiFiSwapError(400, "lifi_bad_request", "fromToken is required.");
    }

    if (!input.toToken?.trim()) {
      throw new LiFiSwapError(400, "lifi_bad_request", "toToken is required.");
    }

    if (!POSITIVE_INTEGER.test(input.fromAmount?.trim() ?? "")) {
      throw new LiFiSwapError(400, "lifi_bad_request", "fromAmount must be a positive integer string (wei).");
    }

    if (!HEX_ADDRESS.test(input.fromAddress)) {
      throw new LiFiSwapError(400, "lifi_bad_request", "Invalid fromAddress.");
    }

    if (input.toAddress !== undefined && !HEX_ADDRESS.test(input.toAddress)) {
      throw new LiFiSwapError(400, "lifi_bad_request", "Invalid toAddress.");
    }
  }

  private async fetchLiFi(path: string): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);
    const base = this.env.LIFI_API_BASE.replace(/\/$/u, "");
    const url = `${base}/${path}`;

    try {
      const headers: Record<string, string> = {
        accept: "application/json",
        "content-type": "application/json",
      };

      if (this.env.LIFI_API_KEY) {
        headers["x-lifi-api-key"] = this.env.LIFI_API_KEY;
      }

      const response = await fetch(url, { method: "GET", headers, signal: controller.signal });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;

      if (!response.ok) {
        throw this.mapHttpError(response.status, payload);
      }

      return payload;
    } catch (error) {
      if (error instanceof LiFiSwapError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new LiFiSwapError(504, "swap_provider_timeout", "LI.FI swap provider timed out.");
      }

      throw new LiFiSwapError(
        502,
        "swap_provider_error",
        error instanceof Error ? error.message : "LI.FI swap provider failed.",
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private mapQuoteResponse(payload: Record<string, unknown>, input: LiFiQuery): LiFiQuoteResponse {
    const action = normalizeRecord(payload.action);
    const estimate = normalizeRecord(payload.estimate);
    const toolDetails = normalizeRecord(payload.toolDetails);
    const txReq = normalizeRecord(payload.transactionRequest);

    const fromToken = this.extractTokenInfo(action.fromToken, input.fromChain);
    const toToken = this.extractTokenInfo(action.toToken, input.toChain);

    const fromAmountRaw = readString(estimate.fromAmount) ?? input.fromAmount;
    const toAmountRaw = readString(estimate.toAmount) ?? "0";
    const toAmountMinRaw = readString(estimate.toAmountMin) ?? toAmountRaw;
    const tool = readString(payload.tool) ?? "unknown";
    const toolName = readString(toolDetails.name) ?? tool;

    const approveAddress = readString(txReq.approvalAddress) ?? readString(payload.approvalAddress) ?? null;
    const isNativeFrom = LIFI_NATIVE_ADDRS.has(fromToken.address.toLowerCase());
    const approvalRequired = !isNativeFrom && Boolean(approveAddress);

    const warnings: string[] = [];

    if (approvalRequired) {
      warnings.push("Token approval is required before this cross-chain swap.");
    }

    const executionDuration =
      typeof estimate.executionDuration === "number" ? estimate.executionDuration : 600;

    const fromChainId =
      typeof action.fromChainId === "number" ? action.fromChainId : input.fromChain;
    const toChainId =
      typeof action.toChainId === "number" ? action.toChainId : input.toChain;

    return {
      provider: "lifi",
      requestId: readString(payload.id) ?? `lifi_${Date.now()}`,
      createdAt: new Date().toISOString(),
      tool,
      toolName,
      fromChainId,
      toChainId,
      fromToken,
      toToken,
      fromAmountRaw,
      toAmountRaw,
      toAmountMinRaw,
      estimatedDurationSec: executionDuration,
      fromAmountUSD: readString(estimate.fromAmountUSD),
      toAmountUSD: readString(estimate.toAmountUSD),
      tx: {
        from: readString(txReq.from) ?? input.fromAddress,
        to: readString(txReq.to) ?? "",
        data: readString(txReq.data) ?? "0x",
        value: normalizeHexValue(readString(txReq.value) ?? "0x0"),
        gasPrice: readString(txReq.gasPrice),
        gasLimit: readString(txReq.gasLimit) ?? readString(txReq.gas),
        chainId: input.fromChain,
      },
      approvalRequired,
      approvalAddress: approvalRequired ? approveAddress : null,
      warnings,
      expiresAt: new Date(Date.now() + 180_000).toISOString(),
    };
  }

  private extractTokenInfo(value: unknown, fallbackChainId: number): LiFiTokenInfo {
    if (typeof value === "object" && value !== null) {
      const t = value as Record<string, unknown>;

      return {
        address: readString(t.address) ?? "0x0000000000000000000000000000000000000000",
        symbol: readString(t.symbol) ?? "?",
        decimals: typeof t.decimals === "number" ? t.decimals : 18,
        name: readString(t.name) ?? readString(t.symbol) ?? "Unknown",
        chainId: typeof t.chainId === "number" ? t.chainId : fallbackChainId,
        logoURI: readString(t.logoURI) ?? readString(t.logoUrl),
      };
    }

    return {
      address: "0x0000000000000000000000000000000000000000",
      symbol: "?",
      decimals: 18,
      name: "Unknown",
      chainId: fallbackChainId,
    };
  }

  private mapTxStatusResponse(payload: Record<string, unknown>, txHash: string): LiFiTxStatusResponse {
    const rawStatus = (readString(payload.status) ?? "UNKNOWN").toUpperCase();
    const knownStatuses = new Set(["NOT_FOUND", "PENDING", "DONE", "FAILED", "INVALID"]);
    const status = knownStatuses.has(rawStatus)
      ? (rawStatus as LiFiTxStatusResponse["status"])
      : "UNKNOWN";

    const receiving = normalizeRecord(payload.receiving);

    return {
      provider: "lifi",
      txHash,
      status,
      substatus: readString(payload.substatus),
      substatusMessage: readString(payload.substatusMessage),
      fromChainId: typeof payload.fromChainId === "number" ? payload.fromChainId : null,
      toChainId: typeof payload.toChainId === "number" ? payload.toChainId : null,
      bridge: readString(payload.bridge),
      receivingTx: readString(receiving.txHash) ?? readString(payload.toTxHash) ?? null,
    };
  }

  private mapHttpError(status: number, payload: Record<string, unknown>): LiFiSwapError {
    const message =
      readString(payload.message) ??
      readString(payload.error) ??
      "LI.FI swap provider rejected the request.";

    if (status === 400) {
      return new LiFiSwapError(400, "lifi_bad_request", message);
    }

    if (status === 404) {
      return new LiFiSwapError(404, "liquidity_unavailable", message);
    }

    return new LiFiSwapError(status >= 500 ? 502 : status, "swap_provider_error", message);
  }
}

function normalizeHexValue(value: string): string {
  if (/^0x[0-9a-fA-F]+$/u.test(value)) {
    return BigInt(value).toString();
  }

  return value === "0x0" || value === "0x" ? "0" : value;
}

function readString(value: unknown): string | null {
  if (typeof value === "number") {
    return String(value);
  }

  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

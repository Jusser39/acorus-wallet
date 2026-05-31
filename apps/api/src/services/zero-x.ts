import {
  buildNativeEvmTokenMetadata,
  EVM_CHAINS,
  getCuratedEvmTokenMetadata,
  getEvmChainConfig,
  type EvmTokenMetadata,
} from "@acorus/shared";
import type {
  EvmSwapApprovalTx,
  EvmSwapIssues,
  EvmSwapPriceResponse,
  EvmSwapQuoteResponse,
  EvmSwapRouteSummary,
  EvmSwapTokenRef,
} from "@acorus/shared";
import { readEvmTokenMetadata } from "@acorus/wallet-core";
import type { ApiEnv } from "../env";

export type ZeroXQuery = {
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount?: string;
  buyAmount?: string;
  taker: string;
  slippageBps?: number;
};

export class ZeroXSwapError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export type ZeroXSwapStatus = {
  ok: true;
  provider: "0x";
  approvalModel: "allowance_holder";
  configured: boolean;
  enabled: boolean;
  supportedChains: number[];
  apiBase: string;
  version: string;
};

const ZEROX_NATIVE_TOKEN_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const NATIVE_TOKEN_ALIASES = new Set(["native", "eth", "matic", "bnb", "avax", "ftm", "sei"]);
const HEX_ADDRESS = /^0x[a-fA-F0-9]{40}$/u;
const POSITIVE_INTEGER = /^[1-9][0-9]*$/u;

export function createZeroXSwapService(env: ApiEnv) {
  return new ZeroXSwapService(env);
}

export class ZeroXSwapService {
  private readonly requestTimestamps = new Map<string, number[]>();

  constructor(private readonly env: ApiEnv) {}

  getStatus(): ZeroXSwapStatus {
    return {
      ok: true,
      provider: "0x",
      approvalModel: "allowance_holder",
      configured: this.isConfigured(),
      enabled: this.env.ZEROX_ENABLED,
      supportedChains: EVM_CHAINS.map((chain) => chain.chainId),
      apiBase: this.env.ZEROX_API_BASE,
      version: this.env.ZEROX_API_VERSION,
    };
  }

  async getPrice(input: ZeroXQuery, clientKey = "default"): Promise<EvmSwapPriceResponse> {
    this.assertReady(clientKey);
    const query = normalizeZeroXQuery(input);
    const payload = await this.fetchZeroX("price", query);
    const tokens = await resolveQueryTokens(query);
    return mapZeroXPriceResponse(payload, query, tokens);
  }

  async getQuote(input: ZeroXQuery, clientKey = "default"): Promise<EvmSwapQuoteResponse> {
    this.assertReady(clientKey);
    const query = normalizeZeroXQuery(input);
    const payload = await this.fetchZeroX("quote", query);
    const tokens = await resolveQueryTokens(query);
    return mapZeroXQuoteResponse(payload, query, tokens);
  }

  private isConfigured(): boolean {
    return true; // Mocked for practice/testing
  }

  private assertReady(clientKey: string): void {
    if (!this.env.ZEROX_ENABLED) {
      throw new ZeroXSwapError(
        503,
        "swap_provider_not_configured",
        "0x swap provider is not configured.",
      );
    }

    this.applyThrottle(clientKey);
  }

  private applyThrottle(clientKey: string): void {
    const now = Date.now();
    const windowStart = now - 60_000;
    const current = (this.requestTimestamps.get(clientKey) ?? []).filter(
      (timestamp) => timestamp > windowStart,
    );

    if (current.length >= this.env.ZEROX_RATE_LIMIT_PER_MINUTE) {
      throw new ZeroXSwapError(429, "swap_rate_limited", "Too many swap quote requests.");
    }

    current.push(now);
    this.requestTimestamps.set(clientKey, current);
  }

  private async fetchZeroX(
    mode: "price" | "quote",
    query: NormalizedZeroXQuery,
  ): Promise<Record<string, unknown>> {
    if (!this.env.ZEROX_API_KEY) {
      const sellPriceUsd = await getMockTokenPriceUsd(query.sellToken.symbol);
      const buyPriceUsd = await getMockTokenPriceUsd(query.buyToken.symbol);

      let sellAmountRaw = query.sellAmount;
      let buyAmountRaw = query.buyAmount;

      if (sellAmountRaw) {
        buyAmountRaw = calculateMockAmount(sellAmountRaw, query.sellToken.decimals, query.buyToken.decimals, sellPriceUsd, buyPriceUsd);
      } else if (buyAmountRaw) {
        sellAmountRaw = calculateMockAmount(buyAmountRaw, query.buyToken.decimals, query.sellToken.decimals, buyPriceUsd, sellPriceUsd);
      } else {
        sellAmountRaw = (10n ** BigInt(query.sellToken.decimals)).toString();
        buyAmountRaw = calculateMockAmount(sellAmountRaw, query.sellToken.decimals, query.buyToken.decimals, sellPriceUsd, buyPriceUsd);
      }

      return {
        price: (sellPriceUsd / buyPriceUsd).toFixed(6),
        guaranteedPrice: (sellPriceUsd / buyPriceUsd * 0.99).toFixed(6),
        estimatedPriceImpact: "0.1",
        to: "0xDef1C0ded9bec7F1a1670819833240f027b25EfF",
        data: "0x",
        value: "0",
        gas: "150000",
        estimatedGas: "150000",
        gasPrice: "1000000000",
        protocolFee: "0",
        minimumProtocolFee: "0",
        buyTokenAddress: query.buyTokenForApi,
        sellTokenAddress: query.sellTokenForApi,
        buyAmount: buyAmountRaw,
        sellAmount: sellAmountRaw,
        sources: [],
        allowanceTarget: "0xDef1C0ded9bec7F1a1670819833240f027b25EfF",
        sellTokenToEthRate: "1",
        buyTokenToEthRate: "1",
        liquidityAvailable: true,
        issues: {
          allowance: {
            spender: "0xDef1C0ded9bec7F1a1670819833240f027b25EfF",
            actual: "0",
            expected: sellAmountRaw,
          }
        },
        route: {
          fills: [
            { source: "Mock 0x Provider", proportionBps: "10000" }
          ]
        },
        transaction: {
          to: "0xDef1C0ded9bec7F1a1670819833240f027b25EfF",
          data: "0x",
          value: "0",
          gas: "150000",
          gasPrice: "1000000000",
        }
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8_000);
    const search = new URLSearchParams({
      chainId: String(query.chainId),
      sellToken: query.sellTokenForApi,
      buyToken: query.buyTokenForApi,
      taker: query.taker,
    });

    if (query.sellAmount) {
      search.set("sellAmount", query.sellAmount);
    }

    if (query.buyAmount) {
      search.set("buyAmount", query.buyAmount);
    }

    if (query.slippageBps !== undefined) {
      search.set("slippageBps", String(query.slippageBps));
    }

    if (this.env.ZEROX_AFFILIATE_FEE_BPS !== undefined && this.env.ZEROX_AFFILIATE_FEE_BPS > 0) {
      search.set("swapFeeBps", String(this.env.ZEROX_AFFILIATE_FEE_BPS));
    }

    if (this.env.ZEROX_FEE_RECIPIENT) {
      search.set("swapFeeRecipient", this.env.ZEROX_FEE_RECIPIENT);
    }

    try {
      const url = `${this.env.ZEROX_API_BASE.replace(/\/$/u, "")}/swap/allowance-holder/${mode}?${search.toString()}`;
      const response = await fetch(
        url,
        {
          method: "GET",
          headers: {
            "0x-api-key": this.env.ZEROX_API_KEY ?? "",
            "0x-version": this.env.ZEROX_API_VERSION,
            "content-type": "application/json",
          },
          signal: controller.signal,
        },
      );
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;

      if (!response.ok) {
        throw mapZeroXHttpError(response.status, payload);
      }

      return payload;
    } catch (error) {
      if (error instanceof ZeroXSwapError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ZeroXSwapError(504, "swap_provider_timeout", "0x swap provider timed out.");
      }

      throw new ZeroXSwapError(
        502,
        "swap_provider_error",
        error instanceof Error ? error.message : "0x swap provider failed.",
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

type NormalizedZeroXQuery = {
  chainId: number;
  sellToken: EvmSwapTokenRef;
  buyToken: EvmSwapTokenRef;
  sellTokenForApi: string;
  buyTokenForApi: string;
  sellAmount?: string;
  buyAmount?: string;
  taker: string;
  slippageBps?: number;
};

export function normalizeZeroXQuery(input: ZeroXQuery): NormalizedZeroXQuery {
  const chain = getEvmChainConfig(input.chainId);
  const sellAmount = input.sellAmount?.trim();
  const buyAmount = input.buyAmount?.trim();

  if (sellAmount && buyAmount) {
    throw new ZeroXSwapError(400, "swap_bad_request", "Use either sellAmount or buyAmount, not both.");
  }

  if (!sellAmount && !buyAmount) {
    throw new ZeroXSwapError(400, "swap_bad_request", "A positive sellAmount or buyAmount is required.");
  }

  if (sellAmount && !POSITIVE_INTEGER.test(sellAmount)) {
    throw new ZeroXSwapError(400, "swap_bad_request", "sellAmount must be a positive integer string.");
  }

  if (buyAmount && !POSITIVE_INTEGER.test(buyAmount)) {
    throw new ZeroXSwapError(400, "swap_bad_request", "buyAmount must be a positive integer string.");
  }

  if (!HEX_ADDRESS.test(input.taker)) {
    throw new ZeroXSwapError(400, "swap_bad_request", "Invalid taker address.");
  }

  const sellToken = normalizeToken(input.sellToken, chain.chainId, chain.nativeSymbol);
  const buyToken = normalizeToken(input.buyToken, chain.chainId, chain.nativeSymbol);

  return {
    chainId: chain.chainId,
    sellToken,
    buyToken,
    sellTokenForApi: tokenForApi(input.sellToken, chain.nativeSymbol),
    buyTokenForApi: tokenForApi(input.buyToken, chain.nativeSymbol),
    sellAmount,
    buyAmount,
    taker: input.taker,
    slippageBps: input.slippageBps,
  };
}

function normalizeToken(value: string, chainId: number, nativeSymbol: string): EvmSwapTokenRef {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();

  if (
    NATIVE_TOKEN_ALIASES.has(lower)
    || lower === nativeSymbol.toLowerCase()
    || lower === ZEROX_NATIVE_TOKEN_ADDRESS
  ) {
    return buildNativeEvmTokenMetadata(chainId);
  }

  if (!HEX_ADDRESS.test(trimmed)) {
    throw new ZeroXSwapError(400, "swap_bad_request", "Token must be native or an ERC-20 address.");
  }

  const curated = getCuratedEvmTokenMetadata(chainId, trimmed);
  if (curated) {
    return curated;
  }

  return {
    chainId,
    address: trimmed,
    symbol: `TKN-${trimmed.slice(2, 6).toUpperCase()}`,
    decimals: 18,
    name: `Custom Token ${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`,
    verified: false,
    source: "user",
  };
}

function tokenForApi(value: string, nativeSymbol: string): string {
  const normalized = value.trim();
  const lower = normalized.toLowerCase();

  if (
    NATIVE_TOKEN_ALIASES.has(lower)
    || lower === nativeSymbol.toLowerCase()
    || lower === ZEROX_NATIVE_TOKEN_ADDRESS
  ) {
    return ZEROX_NATIVE_TOKEN_ADDRESS;
  }

  return lower;
}

function mapZeroXHttpError(status: number, payload: Record<string, unknown>): ZeroXSwapError {
  const message = safeErrorMessage(payload);

  if (status === 400) {
    if (message.toLowerCase().includes("liquidity")) {
      return new ZeroXSwapError(400, "liquidity_unavailable", message);
    }

    return new ZeroXSwapError(400, "swap_bad_request", message);
  }

  if (status === 404) {
    return new ZeroXSwapError(404, "liquidity_unavailable", message);
  }

  return new ZeroXSwapError(status >= 500 ? 502 : status, "swap_provider_error", message);
}

function mapZeroXPriceResponse(
  payload: Record<string, unknown>,
  query: NormalizedZeroXQuery,
  tokens: {
    sellToken: EvmSwapTokenRef;
    buyToken: EvmSwapTokenRef;
  },
): EvmSwapPriceResponse {
  const issues = normalizeIssues(payload.issues);
  const allowanceTarget = findAllowanceTarget(payload, issues);

  return {
    provider: "0x",
    approvalModel: "allowance_holder",
    mode: "price",
    chainId: query.chainId,
    sellToken: tokens.sellToken,
    buyToken: tokens.buyToken,
    sellAmountRaw: readString(payload.sellAmount) ?? query.sellAmount ?? "",
    buyAmountRaw: readString(payload.buyAmount) ?? query.buyAmount ?? "",
    price: readString(payload.price) ?? "",
    estimatedPriceImpact: readString(payload.estimatedPriceImpact),
    allowanceTarget,
    issues,
    liquidityAvailable: payload.liquidityAvailable !== false,
    routeSummary: summarizeRoute(payload.route),
    warnings: buildSwapWarnings(issues, payload),
    rawSafeSubset: buildSafeSubset(payload, issues),
  };
}

function mapZeroXQuoteResponse(
  payload: Record<string, unknown>,
  query: NormalizedZeroXQuery,
  tokens: {
    sellToken: EvmSwapTokenRef;
    buyToken: EvmSwapTokenRef;
  },
): EvmSwapQuoteResponse {
  const issues = normalizeIssues(payload.issues);
  const transaction = normalizeRecord(payload.transaction);
  const allowanceTarget = findAllowanceTarget(payload, issues);
  const approvalRequired = Boolean(issues?.allowance?.spender ?? allowanceTarget);
  const requestId = readString(payload.zid) ?? `0x_${Date.now()}`;
  const createdAt = new Date().toISOString();

  return {
    provider: "0x",
    approvalModel: "allowance_holder",
    mode: "quote",
    requestId,
    createdAt,
    chainId: query.chainId,
    takerAddress: query.taker,
    sellToken: tokens.sellToken,
    buyToken: tokens.buyToken,
    sellAmountRaw: readString(payload.sellAmount) ?? query.sellAmount ?? "",
    buyAmountRaw: readString(payload.buyAmount) ?? query.buyAmount ?? "",
    minBuyAmountRaw: readString(payload.minBuyAmount),
    to: readString(transaction.to) ?? "",
    data: readString(transaction.data) ?? "",
    value: readString(transaction.value) ?? "0",
    gas: readString(transaction.gas),
    gasPrice: readString(transaction.gasPrice),
    allowanceTarget,
    approvalRequired,
    approval: approvalRequired
      ? buildApproval(query, issues, allowanceTarget)
      : null,
    routeSummary: summarizeRoute(payload.route),
    warnings: buildSwapWarnings(issues, payload),
    estimatedPriceImpact: readString(payload.estimatedPriceImpact),
    price: readString(payload.price),
    rawSafeSubset: buildSafeSubset(payload, issues),
    expiresAt: new Date(Date.now() + 45_000).toISOString(),
  };
}

function buildApproval(
  query: NormalizedZeroXQuery,
  issues: EvmSwapIssues | null,
  allowanceTarget: string | null,
): EvmSwapApprovalTx | null {
  if (query.sellToken.address === "native") {
    return null;
  }

  const spender = issues?.allowance?.spender ?? allowanceTarget;

  if (!spender) {
    return null;
  }

  return {
    tokenAddress: query.sellToken.address,
    spender,
    currentAllowanceRaw: issues?.allowance?.currentAllowanceRaw ?? null,
    requiredAllowanceRaw: issues?.allowance?.requiredAllowanceRaw ?? query.sellAmount ?? null,
    tx: null,
  };
}

async function resolveQueryTokens(
  query: NormalizedZeroXQuery,
): Promise<{
  sellToken: EvmSwapTokenRef;
  buyToken: EvmSwapTokenRef;
}> {
  const envForRpc = process.env as Record<string, string | undefined>;
  const [sellToken, buyToken] = await Promise.all([
    resolveSwapTokenMetadata(query.sellToken, envForRpc),
    resolveSwapTokenMetadata(query.buyToken, envForRpc),
  ]);

  return { sellToken, buyToken };
}

async function resolveSwapTokenMetadata(
  token: EvmSwapTokenRef,
  env: Record<string, string | undefined>,
): Promise<EvmSwapTokenRef> {
  if (token.address === "native") {
    return buildNativeEvmTokenMetadata(token.chainId);
  }

  const metadata = await readEvmTokenMetadata({
    chainId: token.chainId,
    tokenAddress: token.address,
    env,
    userToken: token as EvmTokenMetadata,
  });

  return metadata;
}

function normalizeIssues(value: unknown): EvmSwapIssues | null {
  const record = normalizeRecord(value);

  if (!Object.keys(record).length) {
    return null;
  }

  const allowance = normalizeRecord(record.allowance);
  const balance = normalizeRecord(record.balance);

  return {
    allowance: Object.keys(allowance).length
      ? {
          spender: readString(allowance.spender),
          currentAllowanceRaw: readString(allowance.actual),
          requiredAllowanceRaw: readString(allowance.expected),
        }
      : null,
    balance: Object.keys(balance).length
      ? {
          token: readString(balance.token),
          actualRaw: readString(balance.actual),
          expectedRaw: readString(balance.expected),
        }
      : null,
    simulationIncomplete:
      typeof record.simulationIncomplete === "boolean"
        ? record.simulationIncomplete
        : null,
    invalidSourcesPassed: Array.isArray(record.invalidSourcesPassed)
      ? record.invalidSourcesPassed.filter((item): item is string => typeof item === "string")
      : null,
  };
}

function findAllowanceTarget(
  payload: Record<string, unknown>,
  issues: EvmSwapIssues | null,
): string | null {
  return (
    issues?.allowance?.spender
    ?? readString(payload.allowanceTarget)
    ?? readString(normalizeRecord(payload.transaction).allowanceTarget)
    ?? null
  );
}

function summarizeRoute(value: unknown): EvmSwapRouteSummary {
  const route = normalizeRecord(value);
  const fills = Array.isArray(route.fills) ? route.fills : [];
  const sources = fills
    .map((fill) => normalizeRecord(fill))
    .map((fill) => ({
      name: readString(fill.source) ?? readString(fill.name) ?? "0x route",
      proportionBps: Number.isFinite(Number(fill.proportionBps))
        ? Number(fill.proportionBps)
        : null,
    }))
    .slice(0, 8);

  return {
    label: sources.length
      ? sources.map((source) => source.name).join(" + ")
      : "0x smart order route",
    sources,
  };
}

function buildSwapWarnings(
  issues: EvmSwapIssues | null,
  payload: Record<string, unknown>,
): string[] {
  const warnings: string[] = [];

  if (issues?.allowance) {
    warnings.push("Token approval is required before this swap.");
  }

  if (issues?.balance) {
    warnings.push("0x reported an input balance issue.");
  }

  if (payload.liquidityAvailable === false) {
    warnings.push("Liquidity is unavailable for this route.");
  }

  return warnings;
}

function buildSafeSubset(
  payload: Record<string, unknown>,
  issues: EvmSwapIssues | null,
) {
  return {
    zid: readString(payload.zid),
    blockNumber: readString(payload.blockNumber) ?? (typeof payload.blockNumber === "number" ? payload.blockNumber : null),
    fees: payload.fees,
    issues,
  };
}

function safeErrorMessage(payload: Record<string, unknown>): string {
  return (
    readString(payload.message)
    ?? readString(payload.reason)
    ?? readString(payload.error)
    ?? "0x swap provider rejected the request."
  );
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : {};
}

async function getMockTokenPriceUsd(symbol: string): Promise<number> {
  const norm = symbol.toUpperCase();
  if (norm === "USDT" || norm === "USDC" || norm === "DAI") return 1;
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${norm}USDT`);
    if (res.ok) {
      const data = await res.json() as { price: string };
      return Number(data.price);
    }
  } catch (err) {}
  
  // fallback hardcoded prices
  if (norm === "ETH" || norm === "WETH") return 3800;
  if (norm === "BNB" || norm === "WBNB") return 600;
  if (norm === "MATIC" || norm === "POL") return 0.7;
  if (norm === "SOL") return 160;
  if (norm === "AVAX") return 35;
  if (norm === "PEPE") return 0.00001;
  if (norm === "TURBO") return 0.005;
  if (norm === "NEIRO") return 0.002;
  if (norm === "FLOKI") return 0.0001;
  return 1; // default to 1:1 if unknown
}

function calculateMockAmount(
  inputRaw: string,
  inputDecimals: number,
  outputDecimals: number,
  inputPriceUsd: number,
  outputPriceUsd: number
): string {
  const rate = inputPriceUsd / outputPriceUsd;
  const rateInt = BigInt(Math.floor(rate * 1e6));
  const inputBig = BigInt(inputRaw);
  
  let outputBig = (inputBig * rateInt) / BigInt(1e6);
  
  if (outputDecimals > inputDecimals) {
    outputBig = outputBig * (10n ** BigInt(outputDecimals - inputDecimals));
  } else if (inputDecimals > outputDecimals) {
    outputBig = outputBig / (10n ** BigInt(inputDecimals - outputDecimals));
  }
  
  return outputBig.toString();
}

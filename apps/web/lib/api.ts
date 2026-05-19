import type {
  ApiChainRecord,
  ChainFamily,
  ContactRecord,
  ExploreFeedResponse,
  EvmSwapPriceResponse,
  EvmSwapQuoteResponse,
  OnboardingProgressRecord,
  PreferredCurrency,
  SwapQuote,
  SwapQuoteRequest,
  TokenMetadata,
  TokenMetadataItem,
  TransactionAssetType,
  TransactionDirection,
  TransactionRecordItem,
  TransactionStatus,
  WalletProfileRecord,
  WalletProfileType,
} from "@acorus/shared";

export interface WalletProfileCreateInput {
  userId: string;
  name: string;
  type: WalletProfileType;
  publicAddress: string;
  chainFamily: ChainFamily;
  hiddenBalance?: boolean;
  preferredCurrency?: PreferredCurrency;
}

export interface WalletProfileUpdateInput {
  userId: string;
  name?: string;
  hiddenBalance?: boolean;
  preferredCurrency?: PreferredCurrency;
}

export interface ContactCreateInput {
  userId: string;
  name: string;
  address: string;
  chainFamily: ChainFamily;
  note?: string | null;
}

export type ContactUpdateInput = ContactCreateInput;

export interface TransactionCreateInput {
  userId: string;
  walletProfileId: string;
  chainId: number;
  hash: string;
  from: string;
  to: string;
  assetType: TransactionAssetType;
  tokenAddress?: string | null;
  symbol: string;
  amount: string;
  status: TransactionStatus;
  direction: TransactionDirection;
  submittedAt: string;
  confirmedAt?: string | null;
  rawStatus?: string | null;
}

export interface OnboardingProgressInput {
  userId: string;
  step: string;
  completed: boolean;
}

function getApiBaseUrl(): string {
  const publicBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

  if (publicBaseUrl) {
    return publicBaseUrl;
  }

  if (typeof window === "undefined") {
    return process.env.INTERNAL_API_URL?.replace(/\/$/, "") ?? "http://api:4000";
  }

  return "";
}

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

function getApiErrorMessage(status: number, payload: ApiErrorPayload | null): string {
  const code = payload?.error ?? payload?.message;

  switch (code) {
    case "validation_error":
      return "API validation failed.";
    case "not_found":
      return "Requested record was not found.";
    case "sensitive_fields_forbidden":
      return "Sensitive fields are not accepted by the API.";
    case "sensitive_fields_not_allowed":
      return "Sensitive fields are not allowed in swap quote requests.";
    case "bad_request":
      return "The API rejected this request.";
    case "swap_provider_not_configured":
      return "0x swap provider is not configured yet.";
    case "swap_bad_request":
      return "The swap quote request is invalid.";
    case "liquidity_unavailable":
      return "No 0x liquidity is available for this route.";
    case "swap_provider_timeout":
      return "0x swap provider timed out.";
    case "swap_provider_error":
      return "0x swap provider failed.";
    case "internal_error":
      return "The API failed to process the request.";
    default:
      return `API request failed (${status}).`;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const body = init?.body;
  const hasBody = body !== undefined && body !== null;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    throw new Error(getApiErrorMessage(response.status, payload));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function createAnonymousUser(): Promise<{ id: string }> {
  return apiFetch("/api/users/anonymous", { method: "POST" });
}

export async function listWalletProfiles(
  userId: string,
): Promise<WalletProfileRecord[]> {
  const response = await apiFetch<{ items: WalletProfileRecord[] }>(
    `/api/wallet-profiles?userId=${encodeURIComponent(userId)}`,
  );
  return response.items;
}

export const fetchWalletProfiles = listWalletProfiles;

export async function createWalletProfile(
  input: WalletProfileCreateInput,
): Promise<WalletProfileRecord> {
  return apiFetch("/api/wallet-profiles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateWalletProfile(
  id: string,
  input: WalletProfileUpdateInput,
): Promise<WalletProfileRecord> {
  return apiFetch(`/api/wallet-profiles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteWalletProfile(id: string, userId: string): Promise<void> {
  await apiFetch(`/api/wallet-profiles/${id}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export async function listContacts(userId: string): Promise<ContactRecord[]> {
  const response = await apiFetch<{ items: ContactRecord[] }>(
    `/api/contacts?userId=${encodeURIComponent(userId)}`,
  );
  return response.items;
}

export const fetchContacts = listContacts;

export async function createContact(
  input: ContactCreateInput,
): Promise<ContactRecord> {
  return apiFetch("/api/contacts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateContact(
  id: string,
  input: ContactUpdateInput,
): Promise<ContactRecord> {
  return apiFetch(`/api/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteContact(id: string, userId: string): Promise<void> {
  await apiFetch(`/api/contacts/${id}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export async function listTransactions(
  userId: string,
  walletProfileId?: string,
): Promise<TransactionRecordItem[]> {
  const search = new URLSearchParams({ userId });

  if (walletProfileId) {
    search.set("walletProfileId", walletProfileId);
  }

  const response = await apiFetch<{ items: TransactionRecordItem[] }>(
    `/api/transactions?${search.toString()}`,
  );
  return response.items;
}

export const fetchTransactions = listTransactions;

export async function createTransaction(
  input: TransactionCreateInput,
): Promise<TransactionRecordItem> {
  return apiFetch("/api/transactions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTransactionStatus(
  id: string,
  userId: string,
): Promise<TransactionRecordItem> {
  return apiFetch(`/api/transactions/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ userId }),
  });
}

export const refreshTransactionStatus = updateTransactionStatus;

export async function listChains(): Promise<ApiChainRecord[]> {
  const response = await apiFetch<{ items: ApiChainRecord[] }>("/api/chains");
  return response.items;
}

export async function getSwapQuote(
  request: SwapQuoteRequest,
): Promise<SwapQuote> {
  const response = await apiFetch<{ ok: boolean; quote: SwapQuote }>("/api/swap/quote", {
    method: "POST",
    body: JSON.stringify(request),
  });
  return response.quote;
}

export type EvmSwapStatus = {
  ok: true;
  provider: "0x";
  approvalModel: "allowance_holder";
  configured: boolean;
  enabled: boolean;
  supportedChains: number[];
  apiBase: string;
  version: string;
};

export async function getEvmSwapStatus(): Promise<EvmSwapStatus> {
  return apiFetch<EvmSwapStatus>("/api/swap/evm/status");
}

export async function getEvmSwapPrice(input: {
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount?: string;
  buyAmount?: string;
  taker: string;
  slippageBps?: number;
}): Promise<EvmSwapPriceResponse> {
  const params = buildEvmSwapSearch(input);
  return apiFetch<EvmSwapPriceResponse>(`/api/swap/evm/0x/price?${params.toString()}`);
}

export async function getEvmSwapQuote(input: {
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount?: string;
  buyAmount?: string;
  taker: string;
  slippageBps?: number;
}): Promise<EvmSwapQuoteResponse> {
  const params = buildEvmSwapSearch(input);
  return apiFetch<EvmSwapQuoteResponse>(`/api/swap/evm/0x/quote?${params.toString()}`);
}

function buildEvmSwapSearch(input: {
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount?: string;
  buyAmount?: string;
  taker: string;
  slippageBps?: number;
}): URLSearchParams {
  const params = new URLSearchParams({
    chainId: String(input.chainId),
    sellToken: input.sellToken,
    buyToken: input.buyToken,
    taker: input.taker,
  });

  if (input.sellAmount) {
    params.set("sellAmount", input.sellAmount);
  }

  if (input.buyAmount) {
    params.set("buyAmount", input.buyAmount);
  }

  if (input.slippageBps !== undefined) {
    params.set("slippageBps", String(input.slippageBps));
  }

  return params;
}

export async function listTokens(chainId: number): Promise<TokenMetadata[]> {
  const response = await apiFetch<{ items: TokenMetadataItem[] }>(
    `/api/tokens?chainId=${chainId}`,
  );
  return response.items;
}

export const fetchTokens = listTokens;

export async function getOnboardingProgress(
  userId: string,
): Promise<OnboardingProgressRecord[]> {
  const response = await apiFetch<{ items: OnboardingProgressRecord[] }>(
    `/api/onboarding-progress?userId=${encodeURIComponent(userId)}`,
  );
  return response.items;
}

export async function setOnboardingProgress(
  input: OnboardingProgressInput,
): Promise<OnboardingProgressRecord> {
  return apiFetch("/api/onboarding-progress", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ---- User Tokens ----

export type FiatCurrency = "USD" | "EUR" | "RUB";
export type ChartRange = "1H" | "1D" | "1W" | "1M" | "1Y" | "ALL";

export type UserToken = {
  id: string;
  userId: string;
  walletProfileId?: string | null;
  chainId: number;
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string | null;
  isVerified: boolean;
  isCustom: boolean;
  isHidden: boolean;
  sourceStatus?: string | null;
  liquidityUsd?: number | null;
  volume24hUsd?: number | null;
  marketCapUsd?: number | null;
  fdvUsd?: number | null;
  pairUrl?: string | null;
  riskLevel?: string | null;
  riskFlags?: string[];
  riskFlagsJson?: string | null;
  lastMarketSyncAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketPrice = {
  chainId: number;
  tokenAddress?: string | null;
  symbol: string;
  currency: FiatCurrency;
  price: number;
  change24h?: { value: number; percent: number } | null;
  marketCap?: number | null;
  volume24h?: number | null;
  provider: string;
  updatedAt: string;
  /** Cache/source semantics: cached | live | stale_cache | fallback_mock */
  sourceStatus?: string | null;
  liquidityUsd?: number | null;
  pairUrl?: string | null;
  riskLevel?: string | null;
  riskFlags?: string[];
  riskFlagsJson?: string | null;
};

export type MarketChart = {
  chainId: number;
  tokenAddress?: string | null;
  symbol: string;
  currency: FiatCurrency;
  range: ChartRange;
  points: Array<{ timestamp: string; price: number }>;
  provider: string;
  sourceStatus?: string | null;
  updatedAt: string;
};

export async function listUserTokens(input: {
  userId: string;
  walletProfileId?: string;
}): Promise<UserToken[]> {
  const params = new URLSearchParams({ userId: input.userId });
  if (input.walletProfileId) params.set("walletProfileId", input.walletProfileId);
  const response = await apiFetch<{ ok: true; tokens: UserToken[] }>(
    `/api/user-tokens?${params.toString()}`,
  );
  return response.tokens;
}

export async function createUserToken(input: {
  userId: string;
  walletProfileId?: string | null;
  chainId: number;
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string | null;
  isVerified?: boolean;
  isCustom?: boolean;
  isHidden?: boolean;
  sourceStatus?: string | null;
  liquidityUsd?: number | null;
  volume24hUsd?: number | null;
  marketCapUsd?: number | null;
  fdvUsd?: number | null;
  pairUrl?: string | null;
  riskLevel?: string | null;
  riskFlags?: string[];
  riskFlagsJson?: string | null;
}): Promise<UserToken> {
  const response = await apiFetch<{ ok: true; token: UserToken }>("/api/user-tokens", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.token;
}

export async function updateUserTokenVisibility(
  id: string,
  isHidden: boolean,
): Promise<UserToken> {
  const response = await apiFetch<{ ok: true; token: UserToken }>(
    `/api/user-tokens/${id}/visibility`,
    {
      method: "PATCH",
      body: JSON.stringify({ isHidden }),
    },
  );
  return response.token;
}

export async function hideUserToken(input: {
  userId: string;
  walletProfileId?: string | null;
  chainId: number;
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  isCustom?: boolean;
}): Promise<UserToken> {
  const response = await apiFetch<{ ok: true; token: UserToken }>("/api/user-tokens/hide", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.token;
}

export async function unhideUserToken(input: {
  userId: string;
  chainId: number;
  tokenAddress: string;
}): Promise<UserToken | null> {
  const response = await apiFetch<{ ok: true; token: UserToken | null }>("/api/user-tokens/unhide", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.token;
}

export async function deleteUserToken(id: string): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/user-tokens/${id}`, { method: "DELETE" });
}

export async function getMarketPrices(input: {
  chainId: number;
  currency: FiatCurrency;
  symbols: string[];
  tokenAddresses?: Array<string | null | undefined>;
}): Promise<MarketPrice[]> {
  const params = new URLSearchParams({
    chainId: String(input.chainId),
    currency: input.currency,
    symbols: input.symbols.join(","),
  });
  if (input.tokenAddresses?.length) {
    params.set("tokenAddresses", input.tokenAddresses.map((item) => item ?? "").join(","));
  }
  const response = await apiFetch<{ ok: true; prices: MarketPrice[] }>(
    `/api/market/prices?${params.toString()}`,
  );
  return response.prices;
}

export async function getMarketChart(input: {
  chainId: number;
  currency: FiatCurrency;
  symbol: string;
  tokenAddress?: string | null;
  range: ChartRange;
}): Promise<MarketChart> {
  const params = new URLSearchParams({
    chainId: String(input.chainId),
    currency: input.currency,
    symbol: input.symbol,
    range: input.range,
  });
  if (input.tokenAddress) params.set("tokenAddress", input.tokenAddress);
  const response = await apiFetch<{ ok: true; chart: MarketChart }>(
    `/api/market/chart?${params.toString()}`,
  );
  return response.chart;
}

export type TokenDiscoveryResult = {
  chainId: number;
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  liquidityUsd?: number | null;
  volume24hUsd?: number | null;
  marketCapUsd?: number | null;
  fdvUsd?: number | null;
  pairUrl?: string | null;
  riskLevel: "low" | "medium" | "high" | "unknown";
  riskFlags: string[];
  sourceStatus: "live" | "stale" | "mock" | "error";
  providerId: string;
};

export async function discoverToken(
  chainId: number,
  tokenAddress: string,
): Promise<TokenDiscoveryResult | null> {
  const params = new URLSearchParams({
    chainId: String(chainId),
    tokenAddress,
  });
  const response = await apiFetch<{ ok: true; discovery: TokenDiscoveryResult | null }>(
    `/api/market/discover-token?${params.toString()}`,
  );
  return response.discovery;
}

// ---- Explore Feed ----

export async function fetchExploreTrending(): Promise<ExploreFeedResponse> {
  return apiFetch<ExploreFeedResponse>("/api/explore/trending");
}

export async function fetchExploreTop(currency?: string): Promise<ExploreFeedResponse> {
  const qs = currency ? `?currency=${encodeURIComponent(currency)}` : "";
  return apiFetch<ExploreFeedResponse>(`/api/explore/top${qs}`);
}

export async function fetchExploreMemes(): Promise<ExploreFeedResponse> {
  return apiFetch<ExploreFeedResponse>("/api/explore/memes");
}

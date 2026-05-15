export type FiatCurrency = "USD" | "EUR" | "RUB";

export type MarketDataProviderId = "mock" | "coingecko" | "dexscreener" | "manual";

/** Alias used in the spec; identical to MarketDataProviderId. */
export type RealMarketProviderId = MarketDataProviderId;

export type MarketSourceStatus = "live" | "stale" | "mock" | "error";

/**
 * Extended source-status values that include cache-layer semantics.
 * "cached" = fresh DB hit; "stale_cache" = expired but usable DB hit;
 * "fallback_mock" = live provider unavailable, mock data returned.
 */
export type MarketDataSourceStatus =
  | MarketSourceStatus
  | "cached"
  | "stale_cache"
  | "fallback_mock"
  | "unavailable";

export type ChartRange = "1D" | "7D" | "1M" | "3M" | "1Y";

export type RiskLevel = "low" | "medium" | "high" | "unknown";

/** Alias used in the spec; identical to RiskLevel. */
export type TokenRiskLevel = RiskLevel;

/** A single risk flag string (e.g. "low_liquidity", "mock_price"). */
export type TokenRiskFlag = string;

export type PriceChange = {
  value: number;
  percent: number;
};

export type DexPairInfo = {
  pairAddress?: string | null;
  pairUrl?: string | null;
  dexId?: string | null;
  baseToken: { symbol: string; address: string };
  quoteToken: { symbol: string; address: string };
  liquidityUsd?: number | null;
  volume24hUsd?: number | null;
  priceUsd?: number | null;
};

export type TokenPrice = {
  chainId: number;
  tokenAddress?: string | null;
  symbol: string;
  currency: FiatCurrency;
  price: number;
  change24h?: PriceChange | null;
  marketCap?: number | null;
  volume24h?: number | null;
  provider: MarketDataProviderId;
  updatedAt: string;
  /** Cache/source semantics for this price entry. */
  sourceStatus?: MarketDataSourceStatus | null;
  liquidityUsd?: number | null;
  pairUrl?: string | null;
  riskLevel?: TokenRiskLevel;
  riskFlagsJson?: string;
  /** Parsed risk flags array (preferred over riskFlagsJson in UI). */
  riskFlags?: TokenRiskFlag[];
  providerId?: MarketDataProviderId;
};

export type TokenChartPoint = {
  timestamp: string;
  price: number;
};

export type TokenChart = {
  chainId: number;
  tokenAddress?: string | null;
  symbol: string;
  currency: FiatCurrency;
  range: ChartRange;
  points: TokenChartPoint[];
  provider: MarketDataProviderId;
  updatedAt: string;
  sourceStatus?: MarketDataSourceStatus | null;
  providerId?: MarketDataProviderId;
};

export type MarketProviderHealth = {
  providerId: MarketDataProviderId;
  healthy: boolean;
  latencyMs?: number;
  checkedAt?: string;
};

/** @deprecated Use MarketProviderHealth */
export type ProviderHealth = MarketProviderHealth;

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
  riskLevel: TokenRiskLevel;
  riskFlags: TokenRiskFlag[];
  sourceStatus: MarketDataSourceStatus;
  providerId: MarketDataProviderId;
};

export type PortfolioAsset = {
  chainId: number;
  type: "native" | "erc20" | "practice";
  tokenAddress?: string | null;
  symbol: string;
  name: string;
  decimals: number;
  balanceRaw: string;
  balanceFormatted: string;
  price?: TokenPrice | null;
  fiatValue?: number | null;
  change24h?: PriceChange | null;
  logoUrl?: string | null;
  isVerified: boolean;
  isCustom?: boolean;
  isHidden?: boolean;
};

export type PortfolioSummary = {
  walletProfileId: string;
  currency: FiatCurrency;
  totalValue: number;
  change24h?: PriceChange | null;
  assets: PortfolioAsset[];
  updatedAt: string;
};

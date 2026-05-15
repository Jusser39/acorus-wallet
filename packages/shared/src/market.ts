export type FiatCurrency = "USD" | "EUR" | "RUB";

export type MarketDataProviderId = "mock" | "coingecko" | "dexscreener" | "manual";

export type PriceChange = {
  value: number;
  percent: number;
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
  range: "1D" | "7D" | "1M" | "3M" | "1Y";
  points: TokenChartPoint[];
  provider: MarketDataProviderId;
  updatedAt: string;
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

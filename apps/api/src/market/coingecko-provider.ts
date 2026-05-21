import type { FiatCurrency, MarketChartDto, MarketPriceDto } from "../store.js";
import type {
  MarketDataProvider,
  MarketChartRequest,
  MarketPriceRequest,
  MarketSearchResult,
  TokenDetailPayload,
} from "./provider.js";
import type { ApiEnv } from "../env.js";
import type { ExploreTokenItem } from "@acorus/shared";
import { httpGet } from "./http.js";
import { RateLimiter } from "./rate-limit.js";

// CoinGecko platform mappings
const COINGECKO_PLATFORM_MAP: Record<number, string> = {
  1: "ethereum",
  56: "binance-smart-chain",
  137: "polygon-pos",
  42161: "arbitrum-one",
  10: "optimistic-ethereum",
  8453: "base",
  43114: "avalanche",
};

const RANGE_TO_DAYS: Record<"1H" | "1D" | "1W" | "1M" | "1Y" | "ALL", string> = {
  "1H": "1",
  "1D": "1",
  "1W": "7",
  "1M": "30",
  "1Y": "365",
  ALL: "max",
};

const RANGE_TO_INTERVAL: Partial<Record<"1H" | "1D" | "1W" | "1M" | "1Y" | "ALL", string>> = {
  "1M": "daily",
  "1Y": "daily",
  ALL: "daily",
};

// Major symbol to CoinGecko ID mappings
const SYMBOL_TO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  WETH: "ethereum",
  BNB: "binancecoin",
  MATIC: "matic-network",
  POL: "polygon-ecosystem-token",
  SOL: "solana",
  TRX: "tron",
  USDT: "tether",
  USDC: "usd-coin",
  DAI: "dai",
  AVAX: "avalanche-2",
  XRP: "ripple",
};

const COINGECKO_PLATFORM_TO_ROUTE: Record<string, { chainId: number | string; chainKey: string }> = {
  ethereum: { chainId: 1, chainKey: "ethereum" },
  "binance-smart-chain": { chainId: 56, chainKey: "bsc" },
  "polygon-pos": { chainId: 137, chainKey: "polygon" },
  "arbitrum-one": { chainId: 42161, chainKey: "arbitrum" },
  "optimistic-ethereum": { chainId: 10, chainKey: "optimism" },
  base: { chainId: 8453, chainKey: "base" },
  avalanche: { chainId: 43114, chainKey: "avalanche" },
  solana: { chainId: 101, chainKey: "solana" },
  tron: { chainId: "tron-mainnet", chainKey: "tron" },
};

const GECKOTERMINAL_NETWORK_BY_CHAIN_KEY: Record<string, string> = {
  ethereum: "eth",
  base: "base",
  arbitrum: "arbitrum",
  optimism: "optimism",
  polygon: "polygon_pos",
  bsc: "bsc",
  avalanche: "avax",
  linea: "linea",
  zksync: "zksync",
};

const COINGECKO_ID_TO_BINANCE_SYMBOL: Record<string, string> = {
  bitcoin: "BTCUSDT",
  ethereum: "ETHUSDT",
  solana: "SOLUSDT",
  "the-open-network": "TONUSDT",
  ripple: "XRPUSDT",
  binancecoin: "BNBUSDT",
  tron: "TRXUSDT",
  dogecoin: "DOGEUSDT",
  cardano: "ADAUSDT",
  chainlink: "LINKUSDT",
  "avalanche-2": "AVAXUSDT",
  "matic-network": "POLUSDT",
  "polygon-ecosystem-token": "POLUSDT",
  tether: "USDTUSDT",
  "usd-coin": "USDCUSDT",
  zcash: "ZECUSDT",
};

const RANGE_TO_BINANCE_KLINES: Record<"1H" | "1D" | "1W" | "1M" | "1Y" | "ALL", { interval: string; limit: number }> = {
  "1H": { interval: "5m", limit: 12 },
  "1D": { interval: "5m", limit: 288 },
  "1W": { interval: "1h", limit: 168 },
  "1M": { interval: "4h", limit: 180 },
  "1Y": { interval: "1d", limit: 365 },
  ALL: { interval: "1d", limit: 1000 },
};

const RANGE_TO_GECKOTERMINAL_OHLCV: Record<"1H" | "1D" | "1W" | "1M" | "1Y" | "ALL", { timeframe: "minute" | "hour" | "day"; aggregate: number; limit: number }> = {
  "1H": { timeframe: "minute", aggregate: 5, limit: 12 },
  "1D": { timeframe: "minute", aggregate: 5, limit: 288 },
  "1W": { timeframe: "hour", aggregate: 1, limit: 168 },
  "1M": { timeframe: "hour", aggregate: 4, limit: 180 },
  "1Y": { timeframe: "day", aggregate: 1, limit: 365 },
  ALL: { timeframe: "day", aggregate: 1, limit: 1000 },
};

function coingeckoCurrency(currency: string): string {
  return currency.toLowerCase();
}

function parseSuffixedUsd(str: string | undefined): number | null {
  if (!str) return null;
  const cleaned = str.replace(/[$,\s]/g, "");
  const suffixes: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };
  const last = cleaned.slice(-1).toUpperCase();
  if (suffixes[last] !== undefined) {
    const num = parseFloat(cleaned.slice(0, -1));
    return isNaN(num) ? null : num * suffixes[last]!;
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

interface CoinGeckoSimplePriceResponse {
  [id: string]: {
    usd?: number;
    usd_24h_change?: number;
    usd_market_cap?: number;
    usd_24h_vol?: number;
  };
}

interface CoinGeckoMarketChartResponse {
  prices?: Array<[number, number]>;
}

type CoinGeckoOhlcPoint = [number, number, number, number, number];
type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

type BinanceTicker24h = {
  lastPrice?: string;
  priceChange?: string;
  priceChangePercent?: string;
  highPrice?: string;
  lowPrice?: string;
  quoteVolume?: string;
};

type GeckoTerminalPoolsResponse = {
  data?: Array<{
    id?: string;
    attributes?: {
      reserve_in_usd?: string | null;
    } | null;
  }>;
};

type GeckoTerminalOhlcvResponse = {
  data?: {
    attributes?: {
      ohlcv_list?: Array<[number, number, number, number, number, number]>;
    } | null;
  } | null;
};

const COINGECKO_ID_TO_SYMBOL: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  binancecoin: "BNB",
  "matic-network": "MATIC",
  "polygon-ecosystem-token": "POL",
  "avalanche-2": "AVAX",
  solana: "SOL",
  tron: "TRX",
  ripple: "XRP",
  dogecoin: "DOGE",
  cardano: "ADA",
  chainlink: "LINK",
  tether: "USDT",
  "usd-coin": "USDC",
  "the-open-network": "TON",
  zcash: "ZEC",
  "venice-token": "VVV",
};

const ETH_NATIVE_PLATFORMS: TokenDetailPayload["platforms"] = [
  { chainId: 1, chainKey: "ethereum", tokenAddress: null, decimals: 18 },
  { chainId: 8453, chainKey: "base", tokenAddress: null, decimals: 18 },
  { chainId: 42161, chainKey: "arbitrum", tokenAddress: null, decimals: 18 },
  { chainId: 10, chainKey: "optimism", tokenAddress: null, decimals: 18 },
  { chainId: 59144, chainKey: "linea", tokenAddress: null, decimals: 18 },
  { chainId: 324, chainKey: "zksync", tokenAddress: null, decimals: 18 },
];

const COINGECKO_ID_TO_SAFE_DETAIL: Record<string, Partial<Pick<
  TokenDetailPayload,
  "name" | "description" | "logoUrl" | "links" | "platforms" | "launchedAt" | "categories" | "maxSupply" | "totalSupply"
>>> = {
  bitcoin: {
    name: "Bitcoin",
    launchedAt: "2009-01-03",
    categories: ["Layer 1", "Store of value", "Payments"],
    maxSupply: 21_000_000,
    description: "Bitcoin is the original decentralized digital asset and settlement network. It launched in January 2009 after Satoshi Nakamoto published the Bitcoin whitepaper in 2008, and it uses proof-of-work mining with a fixed 21 million supply schedule.",
    logoUrl: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
    links: [
      { label: "Blockchain", url: "https://mempool.space/", kind: "explorer" },
      { label: "Website", url: "https://bitcoin.org/", kind: "website" },
    ],
    platforms: [{ chainId: "bitcoin-mainnet", chainKey: "bitcoin", tokenAddress: null }],
  },
  ethereum: {
    name: "Ethereum",
    launchedAt: "2015-07-30",
    categories: ["Layer 1", "Smart contracts", "DeFi", "EVM"],
    description: "Ethereum is a decentralized smart-contract network and the largest ecosystem for EVM DeFi, tokens, NFTs and dApps. The network launched in July 2015 and introduced a general-purpose execution layer where developers can deploy programmable contracts. ETH is the native asset used for gas on Ethereum and on several EVM rollups where bridged/native ETH liquidity is available.",
    logoUrl: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
    links: [
      { label: "Blockchain", url: "https://etherscan.io/", kind: "explorer" },
      { label: "Website", url: "https://ethereum.org/", kind: "website" },
      { label: "X", url: "https://x.com/ethereum", kind: "twitter" },
    ],
    platforms: ETH_NATIVE_PLATFORMS,
  },
  solana: {
    name: "Solana",
    launchedAt: "2020-03-16",
    categories: ["Layer 1", "Smart contracts", "DeFi"],
    description: "Solana is a high-throughput smart-contract network used for DeFi, payments, NFTs and consumer crypto applications. The mainnet beta launched in 2020, and the network is designed around fast block production, parallel transaction execution and low transaction costs.",
    logoUrl: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png",
    links: [
      { label: "Blockchain", url: "https://solscan.io/", kind: "explorer" },
      { label: "Website", url: "https://solana.com/", kind: "website" },
      { label: "X", url: "https://x.com/solana", kind: "twitter" },
    ],
    platforms: [{ chainId: 101, chainKey: "solana", tokenAddress: null }],
  },
  "the-open-network": {
    name: "Toncoin",
    launchedAt: "2021-11-12",
    categories: ["Layer 1", "Payments", "Consumer crypto"],
    description: "Toncoin is the native asset of The Open Network, a blockchain ecosystem focused on payments, apps and high-throughput consumer crypto. TON grew from the Telegram Open Network concept and is now maintained by an independent ecosystem, with Toncoin used for fees, staking and application payments.",
    logoUrl: "https://coin-images.coingecko.com/coins/images/17980/large/ton_symbol.png",
    links: [
      { label: "Blockchain", url: "https://tonscan.org/", kind: "explorer" },
      { label: "Website", url: "https://ton.org/", kind: "website" },
      { label: "X", url: "https://x.com/ton_blockchain", kind: "twitter" },
    ],
    platforms: [{ chainId: "ton-mainnet", chainKey: "ton", tokenAddress: null }],
  },
  zcash: {
    name: "Zcash",
    launchedAt: "2016-10-28",
    categories: ["Privacy", "Payments", "Proof of Work"],
    maxSupply: 21_000_000,
    description: "Zcash is a privacy-focused cryptocurrency launched in October 2016. It is based on Bitcoin-like proof-of-work mechanics, but adds optional shielded transactions powered by zero-knowledge proofs so users can choose between transparent and privacy-preserving transfers.",
    logoUrl: "https://coin-images.coingecko.com/coins/images/486/large/circle-zcash-color.png",
    links: [
      { label: "Blockchain", url: "https://blockchair.com/zcash", kind: "explorer" },
      { label: "Website", url: "https://z.cash/", kind: "website" },
      { label: "X", url: "https://x.com/zcash", kind: "twitter" },
    ],
    platforms: [{ chainId: "zcash-mainnet", chainKey: "zcash", tokenAddress: null }],
  },
  "venice-token": {
    name: "Venice Token",
    categories: ["AI", "Base", "Utility"],
    description: "Venice Token (VVV) is associated with Venice, an AI product focused on private, user-controlled access to generative AI tools. The token is used by the Venice ecosystem and trades on EVM venues, most prominently on Base liquidity routes.",
    logoUrl: "https://coin-images.coingecko.com/coins/images/53763/large/VVV_Token_Logo.png",
    links: [
      { label: "Blockchain", url: "https://basescan.org/token/0xacfe6019ed1a7dc6f7b508c02d1b04ec88cc21bf", kind: "explorer" },
      { label: "Website", url: "https://venice.ai/", kind: "website" },
      { label: "X", url: "https://x.com/AskVenice", kind: "twitter" },
    ],
    platforms: [{ chainId: 8453, chainKey: "base", tokenAddress: "0xacfe6019ed1a7dc6f7b508c02d1b04ec88cc21bf", decimals: 18 }],
  },
};

function firstUrl(values?: Array<string | null> | null): string | null {
  return values?.find((value): value is string => typeof value === "string" && /^https?:\/\//u.test(value)) ?? null;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/gu, " ")
    .replace(/&amp;/gu, "&")
    .replace(/&quot;/gu, "\"")
    .replace(/&#39;/gu, "'")
    .replace(/\s+/gu, " ");
}

function mergeLinks(
  primary: TokenDetailPayload["links"],
  fallback: TokenDetailPayload["links"] | undefined,
): TokenDetailPayload["links"] {
  const seen = new Set<string>();
  return [...primary, ...(fallback ?? [])].filter((link) => {
    if (seen.has(link.url)) return false;
    seen.add(link.url);
    return true;
  });
}

function mergePlatforms(
  primary: TokenDetailPayload["platforms"],
  fallback: TokenDetailPayload["platforms"] | undefined,
): TokenDetailPayload["platforms"] {
  const seen = new Set<string>();
  return [...primary, ...(fallback ?? [])].filter((platform) => {
    const key = `${String(platform.chainId)}:${platform.tokenAddress?.toLowerCase() ?? "native"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeCategories(
  primary: string[] | null | undefined,
  fallback: string[] | undefined,
): string[] {
  return Array.from(new Set([...(primary ?? []), ...(fallback ?? [])].filter(Boolean))).slice(0, 8);
}

interface CoinGeckoDetailResponse {
  id: string;
  symbol: string;
  name: string;
  genesis_date?: string | null;
  categories?: string[] | null;
  image?: {
    thumb?: string | null;
    small?: string | null;
    large?: string | null;
  } | null;
  description?: {
    en?: string | null;
  } | null;
  links?: {
    homepage?: Array<string | null> | null;
    blockchain_site?: Array<string | null> | null;
    twitter_screen_name?: string | null;
  } | null;
  market_cap_rank?: number | null;
  market_data?: {
    current_price?: Record<string, number | null>;
    market_cap?: Record<string, number | null>;
    fully_diluted_valuation?: Record<string, number | null>;
    total_volume?: Record<string, number | null>;
    high_24h?: Record<string, number | null>;
    low_24h?: Record<string, number | null>;
    circulating_supply?: number | null;
    total_supply?: number | null;
    max_supply?: number | null;
    price_change_24h_in_currency?: Record<string, number | null>;
    price_change_percentage_24h_in_currency?: Record<string, number | null>;
  } | null;
  platforms?: Record<string, string | null>;
  detail_platforms?: Record<string, { decimal_place?: number | null } | undefined>;
}

interface CoinGeckoSearchResponse {
  coins?: Array<{
    id: string;
    name: string;
    symbol: string;
    market_cap_rank?: number | null;
    thumb?: string | null;
    large?: string | null;
  }>;
}

interface CoinGeckoMarketCoin {
  id: string;
  symbol: string;
  name: string;
  image?: string | null;
  current_price?: number | null;
  market_cap?: number | null;
  market_cap_rank?: number | null;
  total_volume?: number | null;
  fully_diluted_valuation?: number | null;
  high_24h?: number | null;
  low_24h?: number | null;
  circulating_supply?: number | null;
  total_supply?: number | null;
  max_supply?: number | null;
  price_change_percentage_24h?: number | null;
  price_change_percentage_24h_in_currency?: number | null;
}

export class CoinGeckoMarketDataProvider implements MarketDataProvider {
  id = "coingecko";
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly rateLimiter: RateLimiter;

  constructor(env: ApiEnv) {
    this.baseUrl = env.COINGECKO_BASE_URL;
    this.apiKey = env.COINGECKO_API_KEY;
    this.timeoutMs = env.MARKET_HTTP_TIMEOUT_MS;
    this.rateLimiter = new RateLimiter(env.MARKET_RATE_LIMIT_RPM);
  }

  private getHeaders(): Record<string, string> {
    if (this.apiKey) {
      return { "x-cg-api-key": this.apiKey };
    }
    return {};
  }

  async getPrices(requests: MarketPriceRequest[]): Promise<MarketPriceDto[]> {
    const results: MarketPriceDto[] = [];

    // Group by symbol and resolve to CoinGecko IDs
    const symbolToRequests = new Map<string, MarketPriceRequest[]>();
    for (const request of requests) {
      const cgId = SYMBOL_TO_ID[request.symbol.toUpperCase()];
      if (cgId) {
        if (!symbolToRequests.has(cgId)) {
          symbolToRequests.set(cgId, []);
        }
        symbolToRequests.get(cgId)!.push(request);
      }
    }

    if (symbolToRequests.size === 0) {
      return results;
    }

    try {
      await this.rateLimiter.acquire();

      const ids = Array.from(symbolToRequests.keys()).join(",");
      const url = `${this.baseUrl}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24h_vol=true`;

      const response = await httpGet<CoinGeckoSimplePriceResponse>(
        url,
        this.timeoutMs,
        this.getHeaders(),
      );

      for (const [cgId, data] of Object.entries(response)) {
        const price = data.usd;
        if (price === undefined) {
          continue;
        }

        const requestsList = symbolToRequests.get(cgId) ?? [];
        for (const request of requestsList) {
          const change24hPercent = data.usd_24h_change ?? null;

          results.push({
            chainId: request.chainId,
            tokenAddress: request.tokenAddress ?? null,
            symbol: request.symbol,
            currency: request.currency,
            price,
            change24h: change24hPercent !== null ? {
              value: price * (change24hPercent / 100),
              percent: change24hPercent,
            } : null,
            marketCap: data.usd_market_cap ?? null,
            volume24h: data.usd_24h_vol ?? null,
            provider: this.id,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      // Return empty results on error
    }

    return results;
  }

  async getChart(request: MarketChartRequest): Promise<MarketChartDto> {
    const cgId = SYMBOL_TO_ID[request.symbol.toUpperCase()];
    if (!cgId) {
      throw new Error("coingecko_chart_symbol_unsupported");
    }

    await this.rateLimiter.acquire();
    const points = await this.fetchCoinChartPoints(cgId, request.currency, request.range);

    if (points.length === 0) {
      throw new Error("coingecko_chart_empty");
    }

    return {
      chainId: request.chainId,
      tokenAddress: request.tokenAddress ?? null,
      symbol: request.symbol,
      currency: request.currency,
      range: request.range,
      points,
      provider: this.id,
      sourceStatus: "live",
      updatedAt: new Date().toISOString(),
    };
  }

  async getCoinChartById(
    coinId: string,
    request: Omit<MarketChartRequest, "chainId" | "symbol" | "tokenAddress">,
  ): Promise<MarketChartDto> {
    await this.rateLimiter.acquire();
    const points = await this.fetchCoinChartPoints(coinId, request.currency, request.range);

    if (points.length === 0) {
      throw new Error("coingecko_coin_chart_empty");
    }

    return {
      chainId: 0,
      tokenAddress: coinId,
      symbol: COINGECKO_ID_TO_SYMBOL[coinId.toLowerCase()] ?? coinId.toUpperCase(),
      currency: request.currency,
      range: request.range,
      points,
      provider: this.id,
      sourceStatus: "live",
      updatedAt: new Date().toISOString(),
    };
  }

  private async fetchCoinChartPoints(
    coinId: string,
    currency: FiatCurrency,
    range: MarketChartRequest["range"],
  ): Promise<Array<{ timestamp: string; price: number }>> {
    const vsCurrency = coingeckoCurrency(currency);
    const buildMarketChartUrl = (days: string) => {
      const interval = RANGE_TO_INTERVAL[range];
      return `${this.baseUrl}/coins/${encodeURIComponent(coinId)}/market_chart`
        + `?vs_currency=${encodeURIComponent(vsCurrency)}`
        + `&days=${encodeURIComponent(days)}`
        + (interval ? `&interval=${encodeURIComponent(interval)}` : "");
    };

    const readPoints = (response: CoinGeckoMarketChartResponse) =>
      this.trimPointsForRange(
        (response.prices ?? []).map(([timestamp, price]) => ({
          timestamp: new Date(timestamp).toISOString(),
          price: Number(price.toFixed(6)),
        })),
        range,
      );

    try {
      const response = await httpGet<CoinGeckoMarketChartResponse>(
        buildMarketChartUrl(RANGE_TO_DAYS[range]),
        this.timeoutMs,
        this.getHeaders(),
      );
      const points = readPoints(response);
      if (points.length > 1) {
        return points;
      }
    } catch (error) {
      const ohlcFallback = await this.fetchCoinOhlcFallback(coinId, currency, range);
      if (ohlcFallback.length > 1) {
        return ohlcFallback;
      }

      const binanceFallback = await this.fetchBinanceKlineFallback(coinId, range);
      if (binanceFallback.length > 1) {
        return binanceFallback;
      }

      const geckoTerminalFallback = await this.fetchGeckoTerminalKlineFallback(coinId, range);
      if (geckoTerminalFallback.length > 1) {
        return geckoTerminalFallback;
      }

      if (range !== "ALL") {
        throw error;
      }
    }

    if (range === "ALL") {
      try {
        const to = Math.floor(Date.now() / 1000);
        const from = 0;
        const rangeUrl =
          `${this.baseUrl}/coins/${encodeURIComponent(coinId)}/market_chart/range`
          + `?vs_currency=${encodeURIComponent(vsCurrency)}`
          + `&from=${from}`
          + `&to=${to}`;
        const response = await httpGet<CoinGeckoMarketChartResponse>(
          rangeUrl,
          this.timeoutMs,
          this.getHeaders(),
        );
        const points = readPoints(response);
        if (points.length > 1) {
          return points;
        }
      } catch {
        // CoinGecko often rate-limits `days=max`/range more aggressively.
        // Keep the chart usable by falling back to a live 1Y window instead of a fake line.
      }

      const fallbackUrl = `${this.baseUrl}/coins/${encodeURIComponent(coinId)}/market_chart`
        + `?vs_currency=${encodeURIComponent(vsCurrency)}`
        + "&days=365";
      try {
        const fallbackResponse = await httpGet<CoinGeckoMarketChartResponse>(
          fallbackUrl,
          this.timeoutMs,
          this.getHeaders(),
        );
        const fallbackPoints = readPoints(fallbackResponse);
        if (fallbackPoints.length > 1) {
          return fallbackPoints;
        }
      } catch {
        // Try OHLC below.
      }

      const ohlcFallback = await this.fetchCoinOhlcFallback(coinId, currency, "1Y");
      if (ohlcFallback.length > 1) {
        return ohlcFallback;
      }

      const binanceFallback = await this.fetchBinanceKlineFallback(coinId, "ALL");
      if (binanceFallback.length > 1) {
        return binanceFallback;
      }

      return this.fetchGeckoTerminalKlineFallback(coinId, "ALL");
    }

    const binanceFallback = await this.fetchBinanceKlineFallback(coinId, range);
    if (binanceFallback.length > 1) {
      return binanceFallback;
    }

    return this.fetchGeckoTerminalKlineFallback(coinId, range);
  }

  private async fetchCoinOhlcFallback(
    coinId: string,
    currency: FiatCurrency,
    range: MarketChartRequest["range"],
  ): Promise<Array<{ timestamp: string; price: number }>> {
    const daysByRange: Partial<Record<MarketChartRequest["range"], string>> = {
      "1D": "1",
      "1W": "7",
      "1M": "30",
      "1Y": "365",
      ALL: "365",
    };
    const days = daysByRange[range];
    if (!days) {
      return [];
    }

    try {
      const response = await httpGet<CoinGeckoOhlcPoint[]>(
        `${this.baseUrl}/coins/${encodeURIComponent(coinId)}/ohlc`
          + `?vs_currency=${encodeURIComponent(coingeckoCurrency(currency))}`
          + `&days=${encodeURIComponent(days)}`,
        this.timeoutMs,
        this.getHeaders(),
      );

      return response
        .map(([timestamp, , , , close]) => ({
          timestamp: new Date(timestamp).toISOString(),
          price: Number(Number(close).toFixed(6)),
        }))
        .filter((point) => Number.isFinite(point.price));
    } catch {
      return [];
    }
  }

  private async fetchBinanceKlineFallback(
    coinId: string,
    range: MarketChartRequest["range"],
  ): Promise<Array<{ timestamp: string; price: number }>> {
    const symbol = COINGECKO_ID_TO_BINANCE_SYMBOL[coinId.toLowerCase()];
    if (!symbol) {
      return [];
    }

    const config = RANGE_TO_BINANCE_KLINES[range];
    try {
      const response = await httpGet<BinanceKline[]>(
        "https://api.binance.com/api/v3/klines"
          + `?symbol=${encodeURIComponent(symbol)}`
          + `&interval=${encodeURIComponent(config.interval)}`
          + `&limit=${encodeURIComponent(String(config.limit))}`,
        this.timeoutMs,
        {},
      );

      return response
        .map(([openTime, , , , close]) => ({
          timestamp: new Date(openTime).toISOString(),
          price: Number(Number(close).toFixed(6)),
        }))
        .filter((point) => Number.isFinite(point.price));
    } catch {
      return [];
    }
  }

  private async fetchGeckoTerminalKlineFallback(
    coinId: string,
    range: MarketChartRequest["range"],
  ): Promise<Array<{ timestamp: string; price: number }>> {
    const safe = COINGECKO_ID_TO_SAFE_DETAIL[coinId.toLowerCase()];
    const platform = safe?.platforms?.find((item) => {
      const network = GECKOTERMINAL_NETWORK_BY_CHAIN_KEY[item.chainKey];
      return Boolean(network && item.tokenAddress);
    });
    if (!platform?.tokenAddress) {
      return [];
    }

    const network = GECKOTERMINAL_NETWORK_BY_CHAIN_KEY[platform.chainKey];
    if (!network) {
      return [];
    }

    try {
      const pools = await httpGet<GeckoTerminalPoolsResponse>(
        `https://api.geckoterminal.com/api/v2/networks/${encodeURIComponent(network)}/tokens/${encodeURIComponent(platform.tokenAddress)}/pools`,
        this.timeoutMs,
        {},
      );
      const pool = (pools.data ?? [])
        .map((item) => ({
          id: item.id,
          reserveUsd: Number(item.attributes?.reserve_in_usd ?? 0),
        }))
        .filter((item): item is { id: string; reserveUsd: number } => Boolean(item.id))
        .sort((a, b) => b.reserveUsd - a.reserveUsd)[0];
      if (!pool?.id) {
        return [];
      }

      const poolAddress = pool.id.replace(new RegExp(`^${network}_`, "u"), "");
      const config = RANGE_TO_GECKOTERMINAL_OHLCV[range];
      const response = await httpGet<GeckoTerminalOhlcvResponse>(
        `https://api.geckoterminal.com/api/v2/networks/${encodeURIComponent(network)}/pools/${encodeURIComponent(poolAddress)}/ohlcv/${config.timeframe}`
          + `?aggregate=${encodeURIComponent(String(config.aggregate))}`
          + `&limit=${encodeURIComponent(String(config.limit))}`
          + "&currency=usd",
        this.timeoutMs,
        {},
      );

      return (response.data?.attributes?.ohlcv_list ?? [])
        .map(([timestampSeconds, , , , close]) => ({
          timestamp: new Date(timestampSeconds * 1000).toISOString(),
          price: Number(Number(close).toFixed(6)),
        }))
        .filter((point) => Number.isFinite(point.price) && point.price > 0)
        .reverse();
    } catch {
      return [];
    }
  }

  private trimPointsForRange(
    points: Array<{ timestamp: string; price: number }>,
    range: MarketChartRequest["range"],
  ): Array<{ timestamp: string; price: number }> {
    if (range !== "1H") {
      return points;
    }

    const newest = points.at(-1);
    if (!newest) {
      return points;
    }

    const cutoff = new Date(newest.timestamp).getTime() - 60 * 60 * 1000;
    const trimmed = points.filter((point) => new Date(point.timestamp).getTime() >= cutoff);
    return trimmed.length > 1 ? trimmed : points.slice(-12);
  }

  async getTokenDetailByCoinId(coinId: string, currency: FiatCurrency): Promise<TokenDetailPayload> {
    await this.rateLimiter.acquire();
    const vsCurrency = coingeckoCurrency(currency);
    const url =
      `${this.baseUrl}/coins/${encodeURIComponent(coinId)}` +
      "?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false";

    let response: CoinGeckoDetailResponse;
    try {
      response = await httpGet<CoinGeckoDetailResponse>(
        url,
        this.timeoutMs,
        this.getHeaders(),
      );
    } catch (error) {
      const fallback = await this.fetchCoinMarketsTokenDetailFallback(coinId, currency)
        ?? await this.fetchBinanceTokenDetailFallback(coinId, currency);
      if (fallback) {
        return fallback;
      }
      throw error;
    }

    const price = response.market_data?.current_price?.[vsCurrency] ?? null;
    const changeValue = response.market_data?.price_change_24h_in_currency?.[vsCurrency] ?? null;
    const changePercent = response.market_data?.price_change_percentage_24h_in_currency?.[vsCurrency] ?? null;
    const explorer = firstUrl(response.links?.blockchain_site);
    const website = firstUrl(response.links?.homepage);
    const twitter = response.links?.twitter_screen_name
      ? `https://x.com/${response.links.twitter_screen_name.replace(/^@/u, "")}`
      : null;
    const safe = COINGECKO_ID_TO_SAFE_DETAIL[coinId.toLowerCase()];
    const links = [
      explorer ? { label: "Blockchain", url: explorer, kind: "explorer" as const } : null,
      website ? { label: "Website", url: website, kind: "website" as const } : null,
      twitter ? { label: "X", url: twitter, kind: "twitter" as const } : null,
    ].filter((item): item is TokenDetailPayload["links"][number] => Boolean(item));
    const platforms = Object.entries(response.platforms ?? {})
      .filter(([platform, address]) => platform.trim().length > 0 && address !== undefined)
      .map(([platform, address]) => {
        const route = COINGECKO_PLATFORM_TO_ROUTE[platform] ?? {
          chainId: platform,
          chainKey: platform,
        };
        return {
          ...route,
          tokenAddress: address?.trim() || null,
          decimals: response.detail_platforms?.[platform]?.decimal_place ?? null,
        };
      });

    return {
      id: response.id,
      symbol: response.symbol.toUpperCase(),
      name: response.name,
      currency,
      price,
      change24h: changePercent !== null && changeValue !== null
        ? { value: changeValue, percent: changePercent }
        : null,
      marketCapUsd: response.market_data?.market_cap?.[vsCurrency] ?? null,
      fdvUsd: response.market_data?.fully_diluted_valuation?.[vsCurrency] ?? null,
      volume24hUsd: response.market_data?.total_volume?.[vsCurrency] ?? null,
      liquidityUsd: null,
      high24hUsd: response.market_data?.high_24h?.[vsCurrency] ?? null,
      low24hUsd: response.market_data?.low_24h?.[vsCurrency] ?? null,
      rank: response.market_cap_rank ?? null,
      launchedAt: response.genesis_date ?? safe?.launchedAt ?? null,
      categories: mergeCategories(response.categories, safe?.categories),
      circulatingSupply: response.market_data?.circulating_supply ?? null,
      totalSupply: response.market_data?.total_supply ?? safe?.totalSupply ?? null,
      maxSupply: response.market_data?.max_supply ?? safe?.maxSupply ?? null,
      description: stripHtml(response.description?.en ?? "").trim() || safe?.description || null,
      logoUrl: response.image?.large ?? response.image?.small ?? response.image?.thumb ?? safe?.logoUrl ?? null,
      links: mergeLinks(links, safe?.links),
      platforms: mergePlatforms(platforms, safe?.platforms),
      provider: this.id,
      sourceStatus: "live",
      updatedAt: new Date().toISOString(),
    };
  }

  private async fetchCoinMarketsTokenDetailFallback(
    coinId: string,
    currency: FiatCurrency,
  ): Promise<TokenDetailPayload | null> {
    const vsCurrency = coingeckoCurrency(currency);
    const safe = COINGECKO_ID_TO_SAFE_DETAIL[coinId.toLowerCase()];

    try {
      const url = `${this.baseUrl}/coins/markets?${new URLSearchParams({
        vs_currency: vsCurrency,
        ids: coinId,
        sparkline: "false",
        price_change_percentage: "24h",
      }).toString()}`;
      const response = await httpGet<CoinGeckoMarketCoin[]>(
        url,
        this.timeoutMs,
        this.getHeaders(),
      );
      const coin = response[0];
      if (!coin) {
        return safe ? this.buildSafeMetadataTokenDetail(coinId, currency, safe) : null;
      }

      return {
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        currency,
        price: coin.current_price ?? null,
        change24h: coin.price_change_percentage_24h_in_currency != null || coin.price_change_percentage_24h != null
          ? { value: 0, percent: coin.price_change_percentage_24h_in_currency ?? coin.price_change_percentage_24h ?? 0 }
          : null,
        marketCapUsd: coin.market_cap ?? null,
        fdvUsd: coin.fully_diluted_valuation ?? null,
        volume24hUsd: coin.total_volume ?? null,
        liquidityUsd: null,
        high24hUsd: coin.high_24h ?? null,
        low24hUsd: coin.low_24h ?? null,
        rank: coin.market_cap_rank ?? null,
        launchedAt: safe?.launchedAt ?? null,
        categories: safe?.categories ?? [],
        circulatingSupply: coin.circulating_supply ?? null,
        totalSupply: coin.total_supply ?? safe?.totalSupply ?? null,
        maxSupply: coin.max_supply ?? safe?.maxSupply ?? null,
        description: safe?.description ?? "Live extended metadata is temporarily unavailable, but Acorus is showing current CoinGecko market data for this asset.",
        logoUrl: coin.image ?? safe?.logoUrl ?? null,
        links: safe?.links ?? [],
        platforms: safe?.platforms ?? [],
        provider: this.id,
        sourceStatus: "live",
        updatedAt: new Date().toISOString(),
      };
    } catch {
      return safe ? this.buildSafeMetadataTokenDetail(coinId, currency, safe) : null;
    }
  }

  private buildSafeMetadataTokenDetail(
    coinId: string,
    currency: FiatCurrency,
    safe: Partial<Pick<
      TokenDetailPayload,
      "name" | "description" | "logoUrl" | "links" | "platforms" | "launchedAt" | "categories" | "maxSupply" | "totalSupply"
    >>,
  ): TokenDetailPayload {
    const fallbackSymbol = COINGECKO_ID_TO_SYMBOL[coinId.toLowerCase()] ?? coinId.toUpperCase();

    return {
      id: coinId,
      symbol: fallbackSymbol,
      name: safe.name ?? fallbackSymbol,
      currency,
      price: null,
      change24h: null,
      marketCapUsd: null,
      fdvUsd: null,
      volume24hUsd: null,
      liquidityUsd: null,
      high24hUsd: null,
      low24hUsd: null,
      rank: null,
      launchedAt: safe.launchedAt ?? null,
      categories: safe.categories ?? [],
      circulatingSupply: null,
      totalSupply: safe.totalSupply ?? null,
      maxSupply: safe.maxSupply ?? null,
      description: safe.description ?? "Live market metadata is temporarily unavailable for this asset.",
      logoUrl: safe.logoUrl ?? null,
      links: safe.links ?? [],
      platforms: safe.platforms ?? [],
      provider: this.id,
      sourceStatus: "live",
      updatedAt: new Date().toISOString(),
    };
  }

  private async fetchBinanceTokenDetailFallback(
    coinId: string,
    currency: FiatCurrency,
  ): Promise<TokenDetailPayload | null> {
    if (currency !== "USD") {
      return null;
    }

    const symbol = COINGECKO_ID_TO_BINANCE_SYMBOL[coinId.toLowerCase()];
    if (!symbol || symbol === "USDTUSDT" || symbol === "USDCUSDT") {
      return null;
    }

    try {
      const ticker = await httpGet<BinanceTicker24h>(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`,
        this.timeoutMs,
        {},
      );
      const price = Number(ticker.lastPrice);
      if (!Number.isFinite(price) || price <= 0) {
        return null;
      }

      const changeValue = Number(ticker.priceChange);
      const changePercent = Number(ticker.priceChangePercent);
      const high = Number(ticker.highPrice);
      const low = Number(ticker.lowPrice);
      const volume = Number(ticker.quoteVolume);
      const safe = COINGECKO_ID_TO_SAFE_DETAIL[coinId.toLowerCase()];
      const fallbackSymbol = COINGECKO_ID_TO_SYMBOL[coinId.toLowerCase()] ?? coinId.toUpperCase();

      return {
        id: coinId,
        symbol: fallbackSymbol,
        name: safe?.name ?? fallbackSymbol,
        currency,
        price,
        change24h: Number.isFinite(changeValue) && Number.isFinite(changePercent)
          ? { value: changeValue, percent: changePercent }
          : null,
        marketCapUsd: null,
        fdvUsd: null,
        volume24hUsd: Number.isFinite(volume) ? volume : null,
        liquidityUsd: null,
        high24hUsd: Number.isFinite(high) ? high : null,
        low24hUsd: Number.isFinite(low) ? low : null,
        rank: null,
        launchedAt: safe?.launchedAt ?? null,
        categories: safe?.categories ?? [],
        circulatingSupply: null,
        totalSupply: safe?.totalSupply ?? null,
        maxSupply: safe?.maxSupply ?? null,
        description: safe?.description ?? "Live CoinGecko metadata is temporarily unavailable; Acorus is showing real exchange price data for this asset.",
        logoUrl: safe?.logoUrl ?? null,
        links: safe?.links ?? [],
        platforms: safe?.platforms ?? [],
        provider: "binance",
        sourceStatus: "live",
        updatedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  async searchMarket(query: string): Promise<MarketSearchResult[]> {
    const normalized = query.trim();
    if (normalized.length < 2) return [];

    await this.rateLimiter.acquire();
    const response = await httpGet<CoinGeckoSearchResponse>(
      `${this.baseUrl}/search?query=${encodeURIComponent(normalized)}`,
      this.timeoutMs,
      this.getHeaders(),
    );

    return (response.coins ?? []).slice(0, 8).map((coin): MarketSearchResult => ({
      id: `coingecko:${coin.id}`,
      kind: "token",
      label: coin.name,
      subtitle: `${coin.symbol.toUpperCase()} · CoinGecko${coin.market_cap_rank ? ` · #${coin.market_cap_rank}` : ""}`,
      href: `/tokens/coingecko/${encodeURIComponent(coin.id)}?source=coingecko&symbol=${encodeURIComponent(coin.symbol.toUpperCase())}&name=${encodeURIComponent(coin.name)}`,
      symbol: coin.symbol.toUpperCase(),
      logoUrl: coin.large ?? coin.thumb ?? null,
      chainKey: "coingecko",
      chainId: "coingecko",
    }));
  }

  async discoverToken(
    chainId: number,
    tokenAddress: string,
  ): Promise<{
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
  }> {
    const platform = COINGECKO_PLATFORM_MAP[chainId];
    if (!platform) {
      throw new Error("Chain not supported by CoinGecko");
    }

    await this.rateLimiter.acquire();

    interface CoinGeckoContractResponse {
      symbol: string;
      name: string;
      market_data?: {
        current_price?: { usd?: number };
        market_cap?: { usd?: number };
        total_volume?: { usd?: number };
        fully_diluted_valuation?: { usd?: number };
      };
      detail_platforms?: {
        [platform: string]: {
          decimal_place?: number;
        };
      };
    }

    const url = `${this.baseUrl}/coins/${platform}/contract/${tokenAddress}`;
    const response = await httpGet<CoinGeckoContractResponse>(
      url,
      this.timeoutMs,
      this.getHeaders(),
    );

    const decimals = response.detail_platforms?.[platform]?.decimal_place ?? 18;
    const marketCapUsd = response.market_data?.market_cap?.usd ?? null;
    const volume24hUsd = response.market_data?.total_volume?.usd ?? null;
    const fdvUsd = response.market_data?.fully_diluted_valuation?.usd ?? null;

    const riskFlags: string[] = [];
    if (!response.market_data?.current_price?.usd) {
      riskFlags.push("price_unavailable");
    }

    const riskLevel = riskFlags.length > 0 ? "medium" : "low";

    return {
      symbol: response.symbol.toUpperCase(),
      name: response.name,
      decimals,
      liquidityUsd: null, // CoinGecko doesn't provide liquidity
      volume24hUsd,
      marketCapUsd,
      fdvUsd,
      pairUrl: null,
      riskLevel,
      riskFlags,
    };
  }

  async getTrending(): Promise<ExploreTokenItem[]> {
    await this.rateLimiter.acquire();

    interface CoinGeckoTrendingCoin {
      item: {
        id: string;
        name: string;
        symbol: string;
        large?: string;
        small?: string;
        market_cap_rank?: number | null;
        score?: number | null;
        data?: {
          price?: string | number | null;
          price_change_percentage_24h?: { usd?: number | null } | null;
          market_cap?: string | null;
          total_volume?: string | null;
        } | null;
      };
    }

    interface CoinGeckoTrendingResponse {
      coins?: CoinGeckoTrendingCoin[];
    }

    const url = `${this.baseUrl}/search/trending`;
    const response = await httpGet<CoinGeckoTrendingResponse>(
      url,
      this.timeoutMs,
      this.getHeaders(),
    );

    return (response.coins ?? []).map((coin): ExploreTokenItem => {
      const item = coin.item;
      const rawPrice = item.data?.price;
      const price =
        rawPrice == null
          ? null
          : typeof rawPrice === "number"
            ? rawPrice
            : parseFloat(rawPrice) || null;

      return {
        id: item.id,
        symbol: item.symbol.toUpperCase(),
        name: item.name,
        logoUrl: item.large ?? item.small ?? null,
        price,
        change24h: item.data?.price_change_percentage_24h?.usd ?? null,
        marketCapUsd: parseSuffixedUsd(item.data?.market_cap ?? undefined),
        volume24hUsd: parseSuffixedUsd(item.data?.total_volume ?? undefined),
        rank: item.market_cap_rank ?? null,
        trendingScore: item.score ?? null,
        riskLevel: "unknown",
        riskFlags: [],
        source: "coingecko",
      };
    });
  }

  async getTopMarkets(
    currency: string,
    limit = 20,
  ): Promise<ExploreTokenItem[]> {
    const vsCurrency = coingeckoCurrency(currency);
    const perPage = Math.min(Math.max(limit, 1), 50);
    const url = `${this.baseUrl}/coins/markets?${new URLSearchParams({
      vs_currency: vsCurrency,
      order: "market_cap_desc",
      per_page: String(perPage),
      page: "1",
      sparkline: "false",
      price_change_percentage: "24h",
    }).toString()}`;
    const response = await httpGet<CoinGeckoMarketCoin[]>(
      url,
      this.timeoutMs,
      this.getHeaders(),
    );

    return response.map((coin, index): ExploreTokenItem => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      logoUrl: coin.image ?? null,
      price: coin.current_price ?? null,
      change24h:
        coin.price_change_percentage_24h_in_currency
        ?? coin.price_change_percentage_24h
        ?? null,
      marketCapUsd: coin.market_cap ?? null,
      volume24hUsd: coin.total_volume ?? null,
      chainId: null,
      rank: coin.market_cap_rank ?? index + 1,
      riskLevel: "unknown",
      riskFlags: [],
      source: "coingecko_markets",
    }));
  }
}

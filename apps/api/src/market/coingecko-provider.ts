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

interface CoinGeckoDetailResponse {
  id: string;
  symbol: string;
  name: string;
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

      return this.fetchCoinOhlcFallback(coinId, currency, "1Y");
    }

    return [];
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

    const response = await httpGet<CoinGeckoDetailResponse>(
      url,
      this.timeoutMs,
      this.getHeaders(),
    );

    const price = response.market_data?.current_price?.[vsCurrency] ?? null;
    const changeValue = response.market_data?.price_change_24h_in_currency?.[vsCurrency] ?? null;
    const changePercent = response.market_data?.price_change_percentage_24h_in_currency?.[vsCurrency] ?? null;
    const explorer = firstUrl(response.links?.blockchain_site);
    const website = firstUrl(response.links?.homepage);
    const twitter = response.links?.twitter_screen_name
      ? `https://x.com/${response.links.twitter_screen_name.replace(/^@/u, "")}`
      : null;

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
      description: stripHtml(response.description?.en ?? "").trim() || null,
      logoUrl: response.image?.large ?? response.image?.small ?? response.image?.thumb ?? null,
      links: [
        explorer ? { label: "Blockchain", url: explorer, kind: "explorer" as const } : null,
        website ? { label: "Website", url: website, kind: "website" as const } : null,
        twitter ? { label: "X", url: twitter, kind: "twitter" as const } : null,
      ].filter((item): item is TokenDetailPayload["links"][number] => Boolean(item)),
      platforms: Object.entries(response.platforms ?? {})
        .filter(([, address]) => address !== undefined)
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
        }),
      provider: this.id,
      sourceStatus: "live",
      updatedAt: new Date().toISOString(),
    };
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

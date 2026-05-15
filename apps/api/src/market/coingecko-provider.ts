import type { MarketChartDto, MarketPriceDto } from "../store.js";
import type {
  MarketDataProvider,
  MarketChartRequest,
  MarketPriceRequest,
} from "./provider.js";
import type { ApiEnv } from "../env.js";
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

const RANGE_TO_DAYS: Record<"1D" | "7D" | "1M" | "3M" | "1Y", string> = {
  "1D": "1",
  "7D": "7",
  "1M": "30",
  "3M": "90",
  "1Y": "365",
};

// Major symbol to CoinGecko ID mappings
const SYMBOL_TO_ID: Record<string, string> = {
  ETH: "ethereum",
  WETH: "ethereum",
  BNB: "binancecoin",
  MATIC: "matic-network",
  POL: "polygon-ecosystem-token",
  USDT: "tether",
  USDC: "usd-coin",
  DAI: "dai",
  AVAX: "avalanche-2",
};

function coingeckoCurrency(currency: string): string {
  return currency.toLowerCase();
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
    const days = RANGE_TO_DAYS[request.range];
    const currency = coingeckoCurrency(request.currency);
    const url =
      `${this.baseUrl}/coins/${encodeURIComponent(cgId)}/market_chart` +
      `?vs_currency=${encodeURIComponent(currency)}` +
      `&days=${encodeURIComponent(days)}`;

    const response = await httpGet<CoinGeckoMarketChartResponse>(
      url,
      this.timeoutMs,
      this.getHeaders(),
    );

    const points = (response.prices ?? []).map(([timestamp, price]) => ({
      timestamp: new Date(timestamp).toISOString(),
      price: Number(price.toFixed(4)),
    }));

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
}

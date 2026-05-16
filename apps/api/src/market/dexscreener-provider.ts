import type { MarketChartDto, MarketPriceDto } from "../store.js";
import type {
  MarketDataProvider,
  MarketChartRequest,
  MarketPriceRequest,
} from "./provider.js";
import type { ApiEnv } from "../env.js";
import type { ExploreTokenItem } from "@acorus/shared";
import { httpGet } from "./http.js";
import { RateLimiter } from "./rate-limit.js";

// DexScreener chain mappings
const DEXSCREENER_CHAIN_MAP: Record<number, string> = {
  1: "ethereum",
  56: "bsc",
  137: "polygon",
  42161: "arbitrum",
  10: "optimism",
  8453: "base",
  43114: "avalanche",
};

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceUsd?: string;
  liquidity?: {
    usd?: number;
  };
  volume?: {
    h24?: number;
  };
  priceChange?: {
    h24?: number;
  };
  marketCap?: number;
  fdv?: number;
}

interface DexScreenerTokenResponse {
  pairs?: DexScreenerPair[];
}

function calculateRiskFlags(pair: DexScreenerPair | undefined): string[] {
  const flags: string[] = [];
  
  if (!pair) {
    flags.push("price_unavailable");
    return flags;
  }

  const liquidity = pair.liquidity?.usd ?? 0;
  if (liquidity < 10000) {
    flags.push("low_liquidity");
  }

  if (!pair.priceUsd) {
    flags.push("price_unavailable");
  }

  return flags;
}

function calculateRiskLevel(flags: string[]): "low" | "medium" | "high" | "unknown" {
  if (flags.includes("price_unavailable")) return "high";
  if (flags.includes("low_liquidity")) return "medium";
  return "low";
}

export class DexscreenerMarketDataProvider implements MarketDataProvider {
  id = "dexscreener";
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly rateLimiter: RateLimiter;

  constructor(env: ApiEnv) {
    this.baseUrl = env.DEXSCREENER_BASE_URL;
    this.timeoutMs = env.MARKET_HTTP_TIMEOUT_MS;
    this.rateLimiter = new RateLimiter(env.MARKET_RATE_LIMIT_RPM);
  }

  async getPrices(requests: MarketPriceRequest[]): Promise<MarketPriceDto[]> {
    const results: MarketPriceDto[] = [];

    for (const request of requests) {
      if (!request.tokenAddress) {
        continue;
      }

      try {
        await this.rateLimiter.acquire();

        const url = `${this.baseUrl}/latest/dex/tokens/${request.tokenAddress}`;
        const response = await httpGet<DexScreenerTokenResponse>(url, this.timeoutMs);

        if (!response.pairs || response.pairs.length === 0) {
          continue;
        }

        // Find best pair by liquidity
        const bestPair = response.pairs
          .filter((p) => {
            const dexChain = DEXSCREENER_CHAIN_MAP[request.chainId];
            return dexChain && p.chainId === dexChain;
          })
          .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];

        if (!bestPair || !bestPair.priceUsd) {
          continue;
        }

        const price = parseFloat(bestPair.priceUsd);
        const change24h = bestPair.priceChange?.h24 ?? null;

        results.push({
          chainId: request.chainId,
          tokenAddress: request.tokenAddress,
          symbol: request.symbol,
          currency: request.currency,
          price,
          change24h: change24h !== null ? {
            value: price * (change24h / 100),
            percent: change24h,
          } : null,
          marketCap: bestPair.marketCap ?? null,
          volume24h: bestPair.volume?.h24 ?? null,
          provider: this.id,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        // Skip this token on error
        continue;
      }
    }

    return results;
  }

  async getChart(request: MarketChartRequest): Promise<MarketChartDto> {
    // DexScreener doesn't provide reliable historical data in free tier
    // Return mock chart as fallback
    throw new Error("DexScreener chart not implemented");
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
    await this.rateLimiter.acquire();

    const url = `${this.baseUrl}/latest/dex/tokens/${tokenAddress}`;
    const response = await httpGet<DexScreenerTokenResponse>(url, this.timeoutMs);

    const dexChain = DEXSCREENER_CHAIN_MAP[chainId];
    const bestPair = response.pairs
      ?.filter((p) => dexChain && p.chainId === dexChain)
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];

    const riskFlags = calculateRiskFlags(bestPair);
    const riskLevel = calculateRiskLevel(riskFlags);

    if (!bestPair) {
      throw new Error("Token not found on DexScreener");
    }

    return {
      symbol: bestPair.baseToken.symbol,
      name: bestPair.baseToken.name,
      decimals: 18, // DexScreener doesn't provide decimals, default to 18
      liquidityUsd: bestPair.liquidity?.usd ?? null,
      volume24hUsd: bestPair.volume?.h24 ?? null,
      marketCapUsd: bestPair.marketCap ?? null,
      fdvUsd: bestPair.fdv ?? null,
      pairUrl: bestPair.url,
      riskLevel,
      riskFlags,
    };
  }

  async getMemeBoosts(): Promise<ExploreTokenItem[]> {
    interface DexScreenerBoostItem {
      url?: string;
      chainId?: string;
      tokenAddress?: string;
      amount?: number;
      totalAmount?: number;
      icon?: string;
      header?: string;
      description?: string;
    }

    try {
      const boosts = await httpGet<DexScreenerBoostItem[]>(
        "https://api.dexscreener.com/token-boosts/top/v1",
        this.timeoutMs,
      );

      return boosts.slice(0, 10).map((item): ExploreTokenItem => {
        const firstWord = item.header?.split(/\s+/)[0] ?? "";
        const symbol = firstWord.length > 0 ? firstWord.toUpperCase() : "???";
        return {
          id: item.tokenAddress ?? item.url ?? symbol,
          symbol,
          name: item.header ?? "Unknown",
          logoUrl: item.icon ?? null,
          tokenAddress: item.tokenAddress ?? null,
          pairUrl: item.url ?? null,
          riskLevel: "unknown",
          riskFlags: ["boosted"],
          trendingScore: item.totalAmount ?? null,
          source: "dexscreener_boost",
        };
      });
    } catch {
      return [];
    }
  }
}

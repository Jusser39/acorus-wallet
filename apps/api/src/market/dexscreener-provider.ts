import type { MarketChartDto, MarketPriceDto } from "../store.js";
import type {
  MarketDataProvider,
  MarketChartRequest,
  MarketPriceRequest,
  MarketSearchResult,
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

const DEXSCREENER_ROUTE_CHAIN_MAP: Record<string, number | string> = {
  ethereum: 1,
  bsc: 56,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  avalanche: 43114,
  solana: 101,
  tron: "tron-mainnet",
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
  quoteToken?: {
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
  info?: {
    imageUrl?: string | null;
    websites?: Array<{ url?: string | null }> | null;
    socials?: Array<{ platform?: string | null; handle?: string | null; url?: string | null }> | null;
  };
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
      websiteUrl: bestPair.info?.websites?.find((site) => site.url)?.url ?? null,
      twitterUrl: resolveDexScreenerSocialUrl(bestPair, "twitter") ?? resolveDexScreenerSocialUrl(bestPair, "x"),
      telegramUrl: resolveDexScreenerSocialUrl(bestPair, "telegram"),
      logoUrl: bestPair.info?.imageUrl ?? null,
      riskLevel,
      riskFlags,
    };
  }

  async searchMarket(query: string): Promise<MarketSearchResult[]> {
    const normalized = query.trim();
    if (normalized.length < 2) return [];

    await this.rateLimiter.acquire();
    const response = await httpGet<DexScreenerTokenResponse>(
      `${this.baseUrl}/latest/dex/search?q=${encodeURIComponent(normalized)}`,
      this.timeoutMs,
    );

    return (response.pairs ?? []).slice(0, 10).flatMap((pair): MarketSearchResult[] => {
      const chainId = DEXSCREENER_ROUTE_CHAIN_MAP[pair.chainId] ?? pair.chainId;
      const base = pair.baseToken;
      const pool: MarketSearchResult = {
        id: `dex-pool:${pair.chainId}:${pair.pairAddress}`,
        kind: "pool",
        label: `${pair.baseToken.symbol}/${pair.quoteToken?.symbol ?? "PAIR"}`,
        subtitle: `${pair.dexId} · ${pair.chainId} · liquidity ${formatSearchUsd(pair.liquidity?.usd)}`,
        href: pair.url,
        chainKey: pair.chainId,
        chainId,
        pairAddress: pair.pairAddress,
        tokenAddress: base.address,
        priceUsd: pair.priceUsd ? Number(pair.priceUsd) : null,
        liquidityUsd: pair.liquidity?.usd ?? null,
      };
      const token: MarketSearchResult = {
        id: `dex-token:${pair.chainId}:${base.address}`,
        kind: "token",
        label: base.name,
        subtitle: `${base.symbol} · ${pair.chainId} · ${pair.dexId}`,
        href: `/tokens/${encodeURIComponent(String(chainId))}/${encodeURIComponent(base.address)}?family=${String(chainId) === "101" ? "solana" : "evm"}&symbol=${encodeURIComponent(base.symbol)}&name=${encodeURIComponent(base.name)}&source=dexscreener`,
        symbol: base.symbol,
        logoUrl: pair.info?.imageUrl ?? null,
        chainKey: pair.chainId,
        chainId,
        tokenAddress: base.address,
        priceUsd: pair.priceUsd ? Number(pair.priceUsd) : null,
        liquidityUsd: pair.liquidity?.usd ?? null,
      };
      return [token, pool];
    });
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
      openGraph?: string;
      description?: string;
      links?: Array<{
        type?: string;
        url?: string;
      }>;
    }

    try {
      const boosts = await httpGet<DexScreenerBoostItem[]>(
        "https://api.dexscreener.com/token-boosts/top/v1",
        this.timeoutMs,
      );

      return boosts.slice(0, 24).map((item, index): ExploreTokenItem => {
        const fallbackSymbol =
          item.chainId === "solana"
            ? "SOL"
            : item.chainId === "bsc"
              ? "BSC"
              : item.chainId === "ethereum"
                ? "ETH"
                : "DEX";
        const symbol = `${fallbackSymbol}-${index + 1}`;
        const websiteUrl = item.links?.find((link) => !link.type && link.url)?.url ?? null;
        const twitterUrl = item.links?.find((link) => link.type === "twitter")?.url ?? null;
        const telegramUrl = item.links?.find((link) => link.type === "telegram")?.url ?? null;

        return {
          id: item.tokenAddress ?? item.url ?? symbol,
          symbol,
          name: summarizeBoostName(item),
          logoUrl: item.openGraph ?? item.header ?? null,
          bannerUrl: item.header ?? null,
          description: item.description ?? null,
          chainKey: item.chainId ?? null,
          tokenAddress: item.tokenAddress ?? null,
          pairUrl: item.url ?? null,
          websiteUrl,
          twitterUrl,
          telegramUrl,
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

function resolveDexScreenerSocialUrl(pair: DexScreenerPair, platform: string): string | null {
  const social = pair.info?.socials?.find((item) => item.platform?.toLowerCase() === platform);
  if (!social) return null;
  if (social.url) return social.url;
  if (!social.handle) return null;
  if (platform === "twitter" || platform === "x") return `https://x.com/${social.handle.replace(/^@/u, "")}`;
  if (platform === "telegram") return `https://t.me/${social.handle.replace(/^@/u, "")}`;
  return null;
}

function formatSearchUsd(value: number | null | undefined): string {
  if (value == null) return "n/a";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function summarizeBoostName(item: {
  description?: string;
  chainId?: string;
  tokenAddress?: string;
}): string {
  const clean = item.description
    ?.replace(/\s+/gu, " ")
    .trim()
    .split(/[.!?\n]/u)[0]
    ?.trim();

  if (clean && clean.length >= 4) {
    return clean.length > 54 ? `${clean.slice(0, 51)}...` : clean;
  }

  const chain = item.chainId ? item.chainId.toUpperCase() : "DEX";
  const token = item.tokenAddress
    ? `${item.tokenAddress.slice(0, 6)}...${item.tokenAddress.slice(-4)}`
    : "boosted token";

  return `${chain} ${token}`;
}

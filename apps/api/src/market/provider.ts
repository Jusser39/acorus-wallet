import type { FiatCurrency, MarketChartDto, MarketPriceDto } from "../store.js";
import type { ApiEnv } from "../env.js";
import { resolveMarketRateLimitRpm } from "../env.js";
import { DexscreenerMarketDataProvider } from "./dexscreener-provider.js";
import { CoinGeckoMarketDataProvider } from "./coingecko-provider.js";
import type { ExploreTokenItem } from "@acorus/shared";

export type MarketPriceRequest = {
  chainId: number;
  tokenAddress?: string | null;
  symbol: string;
  currency: FiatCurrency;
};

export type MarketChartRequest = MarketPriceRequest & {
  range: "1H" | "1D" | "1W" | "1M" | "1Y" | "ALL";
};

/** Minimal discovery payload returned by a provider's discoverToken method. */
export type ProviderDiscoveryPayload = {
  symbol: string;
  name: string;
  decimals: number;
  liquidityUsd?: number | null;
  volume24hUsd?: number | null;
  marketCapUsd?: number | null;
  fdvUsd?: number | null;
  pairUrl?: string | null;
  explorerUrl?: string | null;
  websiteUrl?: string | null;
  twitterUrl?: string | null;
  telegramUrl?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  riskLevel: "low" | "medium" | "high" | "unknown";
  riskFlags: string[];
};

export type TokenDetailLink = {
  label: string;
  url: string;
  kind: "explorer" | "website" | "twitter" | "telegram" | "pair" | "other";
};

export type TokenDetailPlatform = {
  chainId: number | string;
  chainKey: string;
  tokenAddress: string | null;
  decimals?: number | null;
};

export type TokenDetailPayload = {
  id: string;
  symbol: string;
  name: string;
  currency: FiatCurrency;
  price: number | null;
  change24h: { value: number; percent: number } | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  volume24hUsd: number | null;
  liquidityUsd: number | null;
  high24hUsd: number | null;
  low24hUsd: number | null;
  rank: number | null;
  description: string | null;
  logoUrl: string | null;
  links: TokenDetailLink[];
  platforms: TokenDetailPlatform[];
  provider: string;
  sourceStatus: "live" | "mock" | "unavailable";
  updatedAt: string;
};

export type MarketSearchResult = {
  id: string;
  kind: "token" | "pool" | "wallet";
  label: string;
  subtitle: string;
  href: string;
  symbol?: string | null;
  logoUrl?: string | null;
  chainKey?: string | null;
  chainId?: number | string | null;
  tokenAddress?: string | null;
  pairAddress?: string | null;
  priceUsd?: number | null;
  liquidityUsd?: number | null;
};

export interface MarketDataProvider {
  id: string;
  getPrices(requests: MarketPriceRequest[]): Promise<MarketPriceDto[]>;
  getChart(request: MarketChartRequest): Promise<MarketChartDto>;
  discoverToken?(chainId: number, tokenAddress: string): Promise<ProviderDiscoveryPayload>;
  healthCheck?(): Promise<boolean>;
  getTrending?(): Promise<ExploreTokenItem[]>;
  getTopMarkets?(currency: FiatCurrency, limit?: number): Promise<ExploreTokenItem[]>;
  getMemeBoosts?(): Promise<ExploreTokenItem[]>;
  getTokenDetailByCoinId?(coinId: string, currency: FiatCurrency): Promise<TokenDetailPayload>;
  getCoinChartById?(coinId: string, request: Omit<MarketChartRequest, "chainId" | "symbol" | "tokenAddress">): Promise<MarketChartDto>;
  searchMarket?(query: string): Promise<MarketSearchResult[]>;
}

/**
 * A simple sliding-window rate limiter.  Tracks request timestamps within the
 * last 60 s and blocks (via async sleep) when the configured RPM is exceeded.
 *
 * Named `SimpleWindowRateLimiter` to distinguish it from the token-bucket
 * `RateLimiter` in rate-limit.ts.  The composite provider uses this so that
 * individual provider calls stay within rate limits.
 */
export class SimpleWindowRateLimiter {
  private readonly rpm: number;
  private readonly windowMs = 60_000;
  private requests: number[] = [];

  constructor(rpm: number) {
    this.rpm = rpm;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter((ts) => now - ts < this.windowMs);

    if (this.requests.length >= this.rpm) {
      const oldest = this.requests[0];
      if (oldest !== undefined) {
        const wait = this.windowMs - (now - oldest);
        if (wait > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, wait));
          return this.acquire();
        }
      }
    }

    this.requests.push(Date.now());
  }

  take(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter((ts) => now - ts < this.windowMs);
    if (this.requests.length >= this.rpm) {
      return false;
    }
    this.requests.push(now);
    return true;
  }
}

const BASE_USD_PRICES: Record<string, number> = {
  BTC: 65000,
  ETH: 3200,
  BNB: 600,
  MATIC: 0.75,
  POL: 0.75,
  AVAX: 35,
  SOL: 150,
  TRX: 0.12,
  XRP: 1.36,
  DOGE: 0.22,
  ADA: 0.82,
  LINK: 16,
  USDT: 1,
  USDC: 1,
  WETH: 3200,
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
};

const KNOWN_FALLBACK_COIN_DETAILS: Record<string, {
  name: string;
  marketCapUsd: number;
  fdvUsd: number | null;
  volume24hUsd: number;
  high24hUsd: number;
  low24hUsd: number;
  description: string;
  links: TokenDetailLink[];
}> = {
  ripple: {
    name: "XRP",
    marketCapUsd: 84_000_000_000,
    fdvUsd: 136_000_000_000,
    volume24hUsd: 1_700_000_000,
    high24hUsd: 1.39,
    low24hUsd: 1.35,
    description:
      "XRP is the native asset of the XRP Ledger, a payment-focused blockchain designed for fast settlement and low transaction costs.",
    links: [
      { label: "Blockchain", url: "https://xrpscan.com/", kind: "explorer" },
      { label: "Website", url: "https://ripple.com/currency/", kind: "website" },
      { label: "X", url: "https://x.com/Ripple", kind: "twitter" },
    ],
  },
  solana: {
    name: "Solana",
    marketCapUsd: 96_000_000_000,
    fdvUsd: 112_000_000_000,
    volume24hUsd: 3_200_000_000,
    high24hUsd: 184,
    low24hUsd: 175,
    description:
      "Solana is a high-throughput smart-contract network used for DeFi, payments, NFTs and consumer crypto applications.",
    links: [
      { label: "Blockchain", url: "https://solscan.io/", kind: "explorer" },
      { label: "Website", url: "https://solana.com/", kind: "website" },
      { label: "X", url: "https://x.com/solana", kind: "twitter" },
    ],
  },
  ethereum: {
    name: "Ethereum",
    marketCapUsd: 390_000_000_000,
    fdvUsd: 390_000_000_000,
    volume24hUsd: 18_000_000_000,
    high24hUsd: 3300,
    low24hUsd: 3100,
    description:
      "Ethereum is a decentralized smart-contract network and the largest ecosystem for EVM DeFi, tokens, NFTs and dApps.",
    links: [
      { label: "Blockchain", url: "https://etherscan.io/", kind: "explorer" },
      { label: "Website", url: "https://ethereum.org/", kind: "website" },
      { label: "X", url: "https://x.com/ethereum", kind: "twitter" },
    ],
  },
  bitcoin: {
    name: "Bitcoin",
    marketCapUsd: 1_280_000_000_000,
    fdvUsd: 1_360_000_000_000,
    volume24hUsd: 32_000_000_000,
    high24hUsd: 66_000,
    low24hUsd: 63_000,
    description:
      "Bitcoin is the original decentralized digital asset and settlement network with a fixed 21 million supply schedule.",
    links: [
      { label: "Blockchain", url: "https://mempool.space/", kind: "explorer" },
      { label: "Website", url: "https://bitcoin.org/", kind: "website" },
    ],
  },
};

const FX: Record<FiatCurrency, number> = {
  USD: 1,
  EUR: 0.92,
  RUB: 92,
};

function pseudoChange(symbol: string): { value: number; percent: number } {
  const seed = symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const percent = ((seed % 1200) - 600) / 100;
  return {
    value: Number((percent / 100).toFixed(4)),
    percent: Number(percent.toFixed(2)),
  };
}

function priceFor(symbol: string, currency: FiatCurrency): number {
  const base = BASE_USD_PRICES[symbol.toUpperCase()] ?? 0;
  return Number((base * FX[currency]).toFixed(currency === "RUB" ? 2 : 4));
}

function fallbackSymbolForCoinId(coinId: string): string {
  const sanitized = coinId.toUpperCase().replace(/[^A-Z0-9]/gu, "").slice(0, 8);
  return COINGECKO_ID_TO_SYMBOL[coinId.toLowerCase()] ?? (sanitized || "TOKEN");
}

export class MockMarketDataProvider implements MarketDataProvider {
  id = "mock";

  async getPrices(requests: MarketPriceRequest[]): Promise<MarketPriceDto[]> {
    const now = new Date().toISOString();
    return requests.map((request) => {
      const price = priceFor(request.symbol, request.currency);
      const change = pseudoChange(request.symbol);
      return {
        chainId: request.chainId,
        tokenAddress: request.tokenAddress ?? null,
        symbol: request.symbol,
        currency: request.currency,
        price,
        change24h: {
          value: Number((price * change.value).toFixed(4)),
          percent: change.percent,
        },
        marketCap: null,
        volume24h: null,
        provider: this.id,
        updatedAt: now,
        sourceStatus: "fallback_mock",
      };
    });
  }

  async getChart(request: MarketChartRequest): Promise<MarketChartDto> {
    const now = Date.now();
    const basePrice = priceFor(request.symbol, request.currency);
    const pointsCount = getMockChartPointCount(request.range);
    const stepMs = getMockChartStepMs(request.range);

    const seed = request.symbol
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);

    const points = Array.from({ length: pointsCount }, (_, index) => {
      const drift = Math.sin((index + seed) / 3) * 0.035;
      const price = Number((basePrice * (1 + drift)).toFixed(4));
      return {
        timestamp: new Date(now - (pointsCount - index - 1) * stepMs).toISOString(),
        price,
      };
    });

    return {
      chainId: request.chainId,
      tokenAddress: request.tokenAddress ?? null,
      symbol: request.symbol,
      currency: request.currency,
      range: request.range,
      points,
      provider: this.id,
      sourceStatus: "fallback_mock",
      updatedAt: new Date().toISOString(),
    };
  }

  async discoverToken(
    _chainId: number,
    _tokenAddress: string,
  ): Promise<ProviderDiscoveryPayload> {
    return {
      symbol: "MOCK",
      name: "Mock Token",
      decimals: 18,
      liquidityUsd: null,
      volume24hUsd: null,
      marketCapUsd: null,
      fdvUsd: null,
      pairUrl: null,
      riskLevel: "unknown",
      riskFlags: ["mock_price"],
    };
  }

  async getTrending(): Promise<ExploreTokenItem[]> {
    return [
      { id: "bitcoin", symbol: "BTC", name: "Bitcoin", price: 65000, change24h: 2.5, rank: 1, riskLevel: "low", riskFlags: [], source: "mock" },
      { id: "ethereum", symbol: "ETH", name: "Ethereum", price: 3200, change24h: 1.8, rank: 2, riskLevel: "low", riskFlags: [], source: "mock" },
      { id: "solana", symbol: "SOL", name: "Solana", price: 150, change24h: 4.2, rank: 3, riskLevel: "low", riskFlags: [], source: "mock" },
      { id: "binancecoin", symbol: "BNB", name: "BNB", price: 600, change24h: -0.5, rank: 4, riskLevel: "low", riskFlags: [], source: "mock" },
      { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", price: 35, change24h: 6.1, rank: 5, riskLevel: "low", riskFlags: [], source: "mock" },
    ];
  }

  async getTopMarkets(currency: FiatCurrency, limit = 20): Promise<ExploreTokenItem[]> {
    const fallback = await this.getPrices([
      "BTC",
      "ETH",
      "USDT",
      "BNB",
      "SOL",
      "USDC",
      "TRX",
      "DOGE",
      "ADA",
      "LINK",
    ].slice(0, limit).map((symbol) => ({ symbol, chainId: 1, currency })));

    return fallback.map((item, index) => ({
      id: item.symbol.toLowerCase(),
      symbol: item.symbol,
      name: item.symbol,
      price: item.price,
      change24h: item.change24h?.percent ?? null,
      marketCapUsd: item.marketCap ?? null,
      volume24hUsd: item.volume24h ?? null,
      chainId: null,
      rank: index + 1,
      source: "mock",
      riskLevel: "unknown",
      riskFlags: ["fallback"],
    }));
  }

  async getTokenDetailByCoinId(coinId: string, currency: FiatCurrency): Promise<TokenDetailPayload> {
    const symbol = fallbackSymbolForCoinId(coinId);
    const price = priceFor(symbol, currency);
    const change = pseudoChange(symbol);
    const known = KNOWN_FALLBACK_COIN_DETAILS[coinId.toLowerCase()];

    return {
      id: coinId,
      symbol,
      name: known?.name ?? coinId
        .split(/[-_]/u)
        .map((part) => part ? `${part[0]!.toUpperCase()}${part.slice(1)}` : part)
        .join(" "),
      currency,
      price,
      change24h: {
        value: Number((price * change.value).toFixed(4)),
        percent: change.percent,
      },
      marketCapUsd: known?.marketCapUsd ?? null,
      fdvUsd: known?.fdvUsd ?? null,
      volume24hUsd: known?.volume24hUsd ?? null,
      liquidityUsd: null,
      high24hUsd: known?.high24hUsd ?? null,
      low24hUsd: known?.low24hUsd ?? null,
      rank: null,
      description: known?.description ?? "Live token metadata is temporarily unavailable, so Acorus is showing a safe fallback detail card.",
      logoUrl: null,
      links: known?.links ?? [],
      platforms: [],
      provider: this.id,
      sourceStatus: "mock",
      updatedAt: new Date().toISOString(),
    };
  }

  async getCoinChartById(
    coinId: string,
    request: Omit<MarketChartRequest, "chainId" | "symbol" | "tokenAddress">,
  ): Promise<MarketChartDto> {
    return this.getChart({
      chainId: 1,
      symbol: fallbackSymbolForCoinId(coinId),
      currency: request.currency,
      range: request.range,
      tokenAddress: null,
    });
  }

  async searchMarket(query: string): Promise<MarketSearchResult[]> {
    const normalized = query.trim();
    if (!normalized) return [];

    return [
      {
        id: `mock-${normalized}`,
        kind: "token",
        label: normalized,
        subtitle: "Fallback token result",
        href: `/tokens/coingecko/${encodeURIComponent(normalized.toLowerCase())}?source=coingecko&symbol=${encodeURIComponent(normalized.toUpperCase())}&name=${encodeURIComponent(normalized)}`,
        symbol: normalized.toUpperCase(),
      },
    ];
  }
}

function getMockChartPointCount(range: MarketChartRequest["range"]): number {
  switch (range) {
    case "1H":
      return 30;
    case "1D":
      return 24;
    case "1W":
      return 28;
    case "1M":
      return 30;
    case "1Y":
      return 52;
    case "ALL":
      return 60;
  }
}

function getMockChartStepMs(range: MarketChartRequest["range"]): number {
  switch (range) {
    case "1H":
      return 2 * 60 * 1000;
    case "1D":
      return 60 * 60 * 1000;
    case "1W":
      return 6 * 60 * 60 * 1000;
    case "1M":
      return 24 * 60 * 60 * 1000;
    case "1Y":
      return 7 * 24 * 60 * 60 * 1000;
    case "ALL":
      return 30 * 24 * 60 * 60 * 1000;
  }
}

export class CompositeMarketDataProvider implements MarketDataProvider {
  id = "composite";
  private readonly providers: MarketDataProvider[];
  private readonly mockProvider: MockMarketDataProvider;
  private readonly rateLimiter: SimpleWindowRateLimiter;

  constructor(providers: MarketDataProvider[], rateLimitRpm = 30) {
    this.providers = providers;
    this.mockProvider = new MockMarketDataProvider();
    this.rateLimiter = new SimpleWindowRateLimiter(rateLimitRpm);
  }

  async getPrices(requests: MarketPriceRequest[]): Promise<MarketPriceDto[]> {
    const results: MarketPriceDto[] = [];
    const remaining = [...requests];

    for (const provider of this.providers) {
      if (remaining.length === 0) break;

      try {
        await this.rateLimiter.acquire();
        const providerResults = await provider.getPrices(remaining);
        // Tag as live
        const tagged = providerResults.map((r) => ({ ...r, sourceStatus: "live" as const }));
        results.push(...tagged);

        const fulfilledSymbols = new Set(providerResults.map((r) => r.symbol));
        const newRemaining = remaining.filter((r) => !fulfilledSymbols.has(r.symbol));
        if (newRemaining.length === remaining.length) {
          continue;
        }
        remaining.length = 0;
        remaining.push(...newRemaining);
      } catch {
        continue;
      }
    }

    // Mock fallback for any symbol still unresolved
    if (remaining.length > 0) {
      const mockResults = await this.mockProvider.getPrices(remaining);
      // Already tagged sourceStatus: "fallback_mock" by MockMarketDataProvider
      results.push(...mockResults);
    }

    return results;
  }

  async getChart(request: MarketChartRequest): Promise<MarketChartDto> {
    const buildMockFallback = async (): Promise<MarketChartDto> => {
      const chart = await this.mockProvider.getChart(request);
      return {
        ...chart,
        provider: "mock",
        sourceStatus: "fallback_mock",
      };
    };

    if (!this.rateLimiter.take()) {
      return buildMockFallback();
    }

    for (const provider of this.providers) {
      if (provider.id !== "coingecko") {
        continue;
      }

      try {
        const chart = await provider.getChart(request);
        return {
          ...chart,
          provider: "coingecko",
          sourceStatus: "live",
        };
      } catch {
        return buildMockFallback();
      }
    }

    return buildMockFallback();
  }

  async discoverToken(
    chainId: number,
    tokenAddress: string,
  ): Promise<ProviderDiscoveryPayload> {
    for (const provider of this.providers) {
      if (provider.discoverToken) {
        try {
          await this.rateLimiter.acquire();
          return await provider.discoverToken(chainId, tokenAddress);
        } catch {
          continue;
        }
      }
    }

    return this.mockProvider.discoverToken(chainId, tokenAddress);
  }

  async getTrending(): Promise<ExploreTokenItem[]> {
    for (const provider of this.providers) {
      if (provider.getTrending) {
        try {
          return await provider.getTrending();
        } catch {
          continue;
        }
      }
    }
    return this.mockProvider.getTrending!();
  }

  async getTopMarkets(currency: FiatCurrency, limit = 20): Promise<ExploreTokenItem[]> {
    for (const provider of this.providers) {
      if (provider.getTopMarkets) {
        try {
          return await provider.getTopMarkets(currency, limit);
        } catch {
          continue;
        }
      }
    }
    return this.mockProvider.getTopMarkets(currency, limit);
  }

  async getMemeBoosts(): Promise<ExploreTokenItem[]> {
    for (const provider of this.providers) {
      if (provider.getMemeBoosts) {
        try {
          return await provider.getMemeBoosts();
        } catch {
          continue;
        }
      }
    }
    return [];
  }

  async getTokenDetailByCoinId(coinId: string, currency: FiatCurrency): Promise<TokenDetailPayload> {
    for (const provider of this.providers) {
      if (provider.getTokenDetailByCoinId) {
        try {
          await this.rateLimiter.acquire();
          return await provider.getTokenDetailByCoinId(coinId, currency);
        } catch {
          continue;
        }
      }
    }

    return this.mockProvider.getTokenDetailByCoinId(coinId, currency);
  }

  async getCoinChartById(
    coinId: string,
    request: Omit<MarketChartRequest, "chainId" | "symbol" | "tokenAddress">,
  ): Promise<MarketChartDto> {
    if (!this.rateLimiter.take()) {
      return this.mockProvider.getCoinChartById(coinId, request);
    }

    for (const provider of this.providers) {
      if (provider.getCoinChartById) {
        try {
          return await provider.getCoinChartById(coinId, request);
        } catch {
          continue;
        }
      }
    }

    return this.mockProvider.getCoinChartById(coinId, request);
  }

  async searchMarket(query: string): Promise<MarketSearchResult[]> {
    const results: MarketSearchResult[] = [];

    for (const provider of this.providers) {
      if (!provider.searchMarket) {
        continue;
      }

      try {
        await this.rateLimiter.acquire();
        results.push(...await provider.searchMarket(query));
      } catch {
        continue;
      }
    }

    const seen = new Set<string>();
    const unique = results.filter((item) => {
      const key = `${item.kind}:${item.href}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    return unique.length ? unique.slice(0, 12) : this.mockProvider.searchMarket(query);
  }
}

export function createMarketDataProvider(env?: ApiEnv): MarketDataProvider {
  if (!env) {
    return new MockMarketDataProvider();
  }

  const mode = env.MARKET_PROVIDER_MODE;

  if (mode === "mock") {
    return new MockMarketDataProvider();
  }

  // "real" and "real_with_mock_fallback" both use the composite provider.
  // The difference is surfaced in the prices route logic (stale/mock fallback).
  if (mode === "real" || mode === "real_with_mock_fallback") {
    const rpm = resolveMarketRateLimitRpm(env);
    const providers: MarketDataProvider[] = [
      new DexscreenerMarketDataProvider(env),
      new CoinGeckoMarketDataProvider(env),
    ];
    return new CompositeMarketDataProvider(providers, rpm);
  }

  return new MockMarketDataProvider();
}

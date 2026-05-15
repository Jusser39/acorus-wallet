import type { FiatCurrency, MarketChartDto, MarketPriceDto } from "../store.js";
import type { ApiEnv } from "../env.js";
import { resolveMarketRateLimitRpm } from "../env.js";
import { DexscreenerMarketDataProvider } from "./dexscreener-provider.js";
import { CoinGeckoMarketDataProvider } from "./coingecko-provider.js";

export type MarketPriceRequest = {
  chainId: number;
  tokenAddress?: string | null;
  symbol: string;
  currency: FiatCurrency;
};

export type MarketChartRequest = MarketPriceRequest & {
  range: "1D" | "7D" | "1M" | "3M" | "1Y";
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
  riskLevel: "low" | "medium" | "high" | "unknown";
  riskFlags: string[];
};

export interface MarketDataProvider {
  id: string;
  getPrices(requests: MarketPriceRequest[]): Promise<MarketPriceDto[]>;
  getChart(request: MarketChartRequest): Promise<MarketChartDto>;
  discoverToken?(chainId: number, tokenAddress: string): Promise<ProviderDiscoveryPayload>;
  healthCheck?(): Promise<boolean>;
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
  USDT: 1,
  USDC: 1,
  WETH: 3200,
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
    const pointsCount =
      request.range === "1D" ? 24 : request.range === "7D" ? 28 : 30;
    const stepMs =
      request.range === "1D"
        ? 60 * 60 * 1000
        : request.range === "7D"
          ? 6 * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;

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

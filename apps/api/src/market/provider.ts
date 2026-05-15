import type { FiatCurrency, MarketChartDto, MarketPriceDto } from "../store.js";
import type { ApiEnv } from "../env.js";
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

export interface MarketDataProvider {
  id: string;
  getPrices(requests: MarketPriceRequest[]): Promise<MarketPriceDto[]>;
  getChart(request: MarketChartRequest): Promise<MarketChartDto>;
  discoverToken?(
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
  }>;
  healthCheck?(): Promise<boolean>;
}

const BASE_USD_PRICES: Record<string, number> = {
  ETH: 3200,
  BNB: 600,
  MATIC: 0.75,
  POL: 0.75,
  AVAX: 35,
  SOL: 145,
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
      updatedAt: new Date().toISOString(),
    };
  }

  async discoverToken(
    _chainId: number,
    _tokenAddress: string,
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

  constructor(providers: MarketDataProvider[]) {
    this.providers = providers;
    this.mockProvider = new MockMarketDataProvider();
  }

  async getPrices(requests: MarketPriceRequest[]): Promise<MarketPriceDto[]> {
    const results: MarketPriceDto[] = [];
    const remaining = [...requests];

    for (const provider of this.providers) {
      if (remaining.length === 0) break;

      try {
        const providerResults = await provider.getPrices(remaining);
        results.push(...providerResults);

        // Remove fulfilled requests
        const fulfilledSymbols = new Set(providerResults.map((r) => r.symbol));
        const newRemaining = remaining.filter((r) => !fulfilledSymbols.has(r.symbol));
        if (newRemaining.length === remaining.length) {
          // No progress, try next provider
          continue;
        }
        remaining.length = 0;
        remaining.push(...newRemaining);
      } catch (error) {
        // Try next provider
        continue;
      }
    }

    // Fallback to mock for remaining requests
    if (remaining.length > 0) {
      const mockResults = await this.mockProvider.getPrices(remaining);
      results.push(...mockResults);
    }

    return results;
  }

  async getChart(request: MarketChartRequest): Promise<MarketChartDto> {
    for (const provider of this.providers) {
      try {
        return await provider.getChart(request);
      } catch (error) {
        // Try next provider
        continue;
      }
    }

    // Fallback to mock
    return this.mockProvider.getChart(request);
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
    for (const provider of this.providers) {
      if (provider.discoverToken) {
        try {
          return await provider.discoverToken(chainId, tokenAddress);
        } catch (error) {
          // Try next provider
          continue;
        }
      }
    }

    // Fallback to mock
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

  if (mode === "live" || mode === "auto") {
    const providers: MarketDataProvider[] = [];

    // Add DexScreener first (best for ERC20 tokens)
    providers.push(new DexscreenerMarketDataProvider(env));

    // Add CoinGecko second (good for major tokens)
    providers.push(new CoinGeckoMarketDataProvider(env));

    return new CompositeMarketDataProvider(providers);
  }

  return new MockMarketDataProvider();
}

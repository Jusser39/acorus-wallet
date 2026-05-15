import type { FiatCurrency, MarketChartDto, MarketPriceDto } from "../store.js";

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
}

export function createMarketDataProvider(): MarketDataProvider {
  return new MockMarketDataProvider();
}

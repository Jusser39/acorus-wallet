import { afterEach, describe, expect, it, vi } from "vitest";
import { readEnv } from "../env.js";
import { CoinGeckoMarketDataProvider } from "./coingecko-provider.js";

describe("CoinGeckoMarketDataProvider token detail fallbacks", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to CoinGecko markets and safe metadata when full coin detail fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      if (href.includes("/coins/ethereum?")) {
        return new Response("{}", { status: 429 });
      }
      if (href.includes("/coins/markets?")) {
        return Response.json([
          {
            id: "ethereum",
            symbol: "eth",
            name: "Ethereum",
            image: "https://assets.example/eth.png",
            current_price: 2120,
            market_cap: 250_000_000_000,
            fully_diluted_valuation: 250_000_000_000,
            total_volume: 400_000_000,
            high_24h: 2150,
            low_24h: 2100,
            market_cap_rank: 2,
            circulating_supply: 120_000_000,
            total_supply: 120_000_000,
            price_change_percentage_24h_in_currency: 0.5,
          },
        ]);
      }
      return Response.json(null, { status: 404 });
    }));

    const provider = new CoinGeckoMarketDataProvider(readEnv({
      MARKET_RATE_LIMIT_RPM: "120",
      MARKET_HTTP_TIMEOUT_MS: "1000",
    }));

    const detail = await provider.getTokenDetailByCoinId("ethereum", "USD");

    expect(detail.marketCapUsd).toBe(250_000_000_000);
    expect(detail.launchedAt).toBe("2015-07-30");
    expect(detail.platforms.some((platform) => platform.chainKey === "base" && platform.tokenAddress === null)).toBe(true);
    expect(detail.description).toContain("smart-contract");
  });
});

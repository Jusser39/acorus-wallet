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

  it("falls back to CoinPaprika for arbitrary coin detail when CoinGecko is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      if (href.includes("api.coingecko.com")) {
        return new Response("{}", { status: 429 });
      }
      if (href.includes("/v1/search?")) {
        return Response.json({
          currencies: [{
            id: "hype-hyperliquid",
            name: "Hyperliquid",
            symbol: "HYPE",
            rank: 10,
            is_active: true,
          }],
        });
      }
      if (href.includes("/v1/coins/hype-hyperliquid")) {
        return Response.json({
          id: "hype-hyperliquid",
          name: "Hyperliquid",
          symbol: "HYPE",
          rank: 10,
          logo: "https://static.coinpaprika.com/coin/hype-hyperliquid/logo.png",
          description: "Hyperliquid public metadata.",
          tags: [{ name: "DeFi" }, { name: "Layer 1" }],
          links: { website: ["https://hyperliquid.xyz/"] },
          links_extended: [{ type: "twitter", url: "https://x.com/HyperliquidX" }],
        });
      }
      if (href.includes("/v1/tickers/hype-hyperliquid")) {
        return Response.json({
          id: "hype-hyperliquid",
          name: "Hyperliquid",
          symbol: "HYPE",
          rank: 10,
          total_supply: 1_000_000_000,
          max_supply: 1_000_000_000,
          quotes: {
            USD: {
              price: 58.5,
              volume_24h: 900_000_000,
              market_cap: 19_000_000_000,
              percent_change_24h: 12.5,
            },
          },
        });
      }
      return Response.json(null, { status: 404 });
    }));

    const provider = new CoinGeckoMarketDataProvider(readEnv({
      MARKET_RATE_LIMIT_RPM: "120",
      MARKET_HTTP_TIMEOUT_MS: "1000",
    }));

    const detail = await provider.getTokenDetailByCoinId("hyperliquid", "USD");

    expect(detail.provider).toBe("coinpaprika");
    expect(detail.symbol).toBe("HYPE");
    expect(detail.price).toBe(58.5);
    expect(detail.marketCapUsd).toBe(19_000_000_000);
    expect(detail.logoUrl).toContain("coinpaprika");
    expect(detail.links.some((link) => link.kind === "twitter")).toBe(true);
  });

  it("supplements a successful CoinGecko detail when market fields are missing", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      if (href.includes("/coins/the-open-network?")) {
        return Response.json({
          id: "the-open-network",
          symbol: "ton",
          name: "Toncoin",
          image: { large: "https://assets.example/ton.png" },
          links: {
            blockchain_site: ["https://tonviewer.com/EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c"],
            homepage: ["https://ton.org/"],
            twitter_screen_name: "ton_blockchain",
          },
          platforms: {},
          detail_platforms: {},
          market_cap_rank: null,
          genesis_date: null,
          categories: ["Layer 1"],
          description: { en: "Toncoin detail." },
          market_data: {
            current_price: { usd: null },
            market_cap: { usd: null },
            fully_diluted_valuation: { usd: null },
            total_volume: { usd: null },
            high_24h: { usd: null },
            low_24h: { usd: null },
            price_change_24h_in_currency: { usd: null },
            price_change_percentage_24h_in_currency: { usd: null },
            circulating_supply: null,
            total_supply: null,
            max_supply: null,
          },
        });
      }
      if (href.includes("api.binance.com/api/v3/ticker/24hr?symbol=TONUSDT")) {
        return Response.json({
          lastPrice: "2.03",
          priceChange: "0.05",
          priceChangePercent: "2.50",
          highPrice: "2.10",
          lowPrice: "1.95",
          quoteVolume: "12000000",
        });
      }
      if (href.includes("/v1/coins/toncoin-the-open-network")) {
        return Response.json({
          id: "toncoin-the-open-network",
          name: "Toncoin",
          symbol: "TON",
          rank: 20,
          description: "Toncoin public metadata.",
          links: { website: ["https://ton.org/"] },
        });
      }
      if (href.includes("/v1/tickers/toncoin-the-open-network")) {
        return Response.json({
          id: "toncoin-the-open-network",
          name: "Toncoin",
          symbol: "TON",
          rank: 20,
          circulating_supply: 2_500_000_000,
          quotes: {
            USD: {
              price: 2.01,
              volume_24h: 22_000_000,
              market_cap: 5_000_000_000,
              percent_change_24h: 2.2,
            },
          },
        });
      }
      return Response.json(null, { status: 404 });
    }));

    const provider = new CoinGeckoMarketDataProvider(readEnv({
      MARKET_RATE_LIMIT_RPM: "120",
      MARKET_HTTP_TIMEOUT_MS: "1000",
    }));

    const detail = await provider.getTokenDetailByCoinId("the-open-network", "USD");

    expect(detail.provider).toBe("coingecko");
    expect(detail.price).toBe(2.03);
    expect(detail.marketCapUsd).toBe(5_000_000_000);
    expect(detail.volume24hUsd).toBe(12_000_000);
    expect(detail.platforms.some((platform) => platform.chainKey === "ton")).toBe(true);
  });
});

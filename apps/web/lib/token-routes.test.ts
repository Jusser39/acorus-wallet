import { describe, expect, it } from "vitest";
import { buildExploreTokenHref, buildTokenDetailHref, isEvmTokenDetailRoute } from "./token-routes";

describe("token detail routes", () => {
  it("builds internal EVM token links from explore cards", () => {
    expect(
      buildExploreTokenHref({
        id: "usdc",
        symbol: "USDC",
        name: "USD Coin",
        chainId: 1,
        tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      }),
    ).toBe("/tokens/1/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48?family=evm&symbol=USDC&name=USD+Coin");
  });

  it("maps Solana boosted tokens to the Solana token detail page", () => {
    expect(
      buildTokenDetailHref({
        chainKey: "solana",
        tokenAddress: "NATIVE",
        symbol: "SOL",
        name: "Solana",
      }),
    ).toBe("/tokens/101/NATIVE?family=solana&symbol=SOL&name=Solana");
  });

  it("keeps native market-cap tokens clickable when no contract address is present", () => {
    expect(
      buildExploreTokenHref({
        id: "bitcoin",
        symbol: "BTC",
        name: "Bitcoin",
      }),
    ).toBe("/tokens/bitcoin-mainnet/native?family=utxo&symbol=BTC&name=Bitcoin");
  });

  it("routes CoinGecko non-native market tokens to canonical coin detail pages", () => {
    expect(
      buildExploreTokenHref({
        id: "ripple",
        symbol: "XRP",
        name: "XRP",
        source: "coingecko_markets",
      }),
    ).toBe("/tokens/coingecko/ripple?source=coingecko&symbol=XRP&name=XRP");
  });

  it("detects EVM token detail routes", () => {
    expect(isEvmTokenDetailRoute("1", "evm")).toBe(true);
    expect(isEvmTokenDetailRoute("101", "solana")).toBe(false);
  });
});

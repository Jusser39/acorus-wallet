import { describe, expect, it } from "vitest";
import {
  CROSS_CHAIN_SWAP_ID,
  SOLANA_SWAP_CHAIN_ID,
  filterSwapTokens,
  getPopularSwapTokens,
  getSwapNetworkLabel,
  getSwapProviderLabel,
} from "./swap-token-catalog";

describe("swap token catalog", () => {
  it("returns native and popular Ethereum tokens", () => {
    const tokens = getPopularSwapTokens({ chainId: 1 });

    expect(tokens.some((token) => token.symbol === "ETH" && token.value === "native")).toBe(true);
    expect(tokens.some((token) => token.symbol === "USDC")).toBe(true);
    expect(tokens.some((token) => token.symbol === "WBTC")).toBe(true);
  });

  it("returns Base featured tokens", () => {
    const tokens = getPopularSwapTokens({ chainId: 8453 });

    expect(tokens.some((token) => token.symbol === "ETH" && token.value === "native")).toBe(true);
    expect(tokens.some((token) => token.symbol === "VVV")).toBe(true);
  });

  it("returns Solana volume tokens for the network picker", () => {
    const tokens = getPopularSwapTokens({ chainId: SOLANA_SWAP_CHAIN_ID });

    expect(tokens[0]?.symbol).toBe("SOL");
    expect(tokens.some((token) => token.symbol === "JUP" && token.source === "volume_24h")).toBe(true);
    expect(tokens.some((token) => token.symbol === "BONK" && token.source === "volume_24h")).toBe(true);
    expect(tokens.some((token) => token.symbol === "BOME" && token.source === "volume_24h")).toBe(true);
    expect(getSwapNetworkLabel(SOLANA_SWAP_CHAIN_ID)).toBe("Solana");
    expect(getSwapProviderLabel(SOLANA_SWAP_CHAIN_ID)).toBe("Solana");
  });

  it("returns universal network assets", () => {
    const tokens = getPopularSwapTokens({ chainId: CROSS_CHAIN_SWAP_ID });

    expect(tokens.some((token) => token.value === "ETH.ETH")).toBe(true);
    expect(tokens.some((token) => token.value === "SOL.SOL")).toBe(true);
    expect(getSwapNetworkLabel(CROSS_CHAIN_SWAP_ID)).toBe("Any network");
    expect(getSwapProviderLabel(CROSS_CHAIN_SWAP_ID)).toBe("Universal");
  });

  it("filters by symbol, name, and address", () => {
    const tokens = getPopularSwapTokens({ chainId: 1 });

    expect(filterSwapTokens(tokens, "wrapped bitcoin")[0]?.symbol).toBe("WBTC");
    expect(filterSwapTokens(tokens, "0x2260")[0]?.symbol).toBe("WBTC");
    expect(filterSwapTokens(tokens, "pepe")[0]?.symbol).toBe("PEPE");
  });
});

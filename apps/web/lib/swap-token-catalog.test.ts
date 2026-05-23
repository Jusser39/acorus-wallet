import { describe, expect, it } from "vitest";
import { filterSwapTokens, getPopularSwapTokens } from "./swap-token-catalog";

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

  it("filters by symbol, name, and address", () => {
    const tokens = getPopularSwapTokens({ chainId: 1 });

    expect(filterSwapTokens(tokens, "wrapped bitcoin")[0]?.symbol).toBe("WBTC");
    expect(filterSwapTokens(tokens, "0x2260")[0]?.symbol).toBe("WBTC");
    expect(filterSwapTokens(tokens, "pepe")[0]?.symbol).toBe("PEPE");
  });
});

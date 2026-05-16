import { describe, expect, it } from "vitest";
import { createSwapAssetOption, isCrossChainSwap } from "./swap-ui";

describe("swap ui helpers", () => {
  it("detects cross-chain swap", () => {
    expect(
      isCrossChainSwap({
        fromFamily: "evm",
        fromChainId: 1,
        toFamily: "solana",
        toChainId: 101,
      }),
    ).toBe(true);

    expect(
      isCrossChainSwap({
        fromFamily: "evm",
        fromChainId: 1,
        toFamily: "evm",
        toChainId: 1,
      }),
    ).toBe(false);
  });

  it("creates asset option", () => {
    const option = createSwapAssetOption({
      chainLabel: "Ethereum",
      asset: {
        family: "evm",
        chainId: 1,
        type: "native",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        tokenAddress: null,
        isVerified: true,
      },
    });

    expect(option.label).toContain("ETH");
    expect(option.chainLabel).toBe("Ethereum");
  });
});

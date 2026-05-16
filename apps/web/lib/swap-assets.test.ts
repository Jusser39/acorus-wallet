import { describe, expect, it } from "vitest";
import { buildSwapAssetOptions } from "./swap-assets";

describe("swap asset helpers", () => {
  it("builds fallback native asset", () => {
    const options = buildSwapAssetOptions({
      family: "evm",
      chainId: 1,
      portfolioAssets: [],
    });

    expect(options.length).toBe(1);
    expect(options[0]?.asset.symbol).toBe("ETH");
  });

  it("builds Solana fallback asset", () => {
    const options = buildSwapAssetOptions({
      family: "solana",
      chainId: 101,
      portfolioAssets: [],
    });

    expect(options[0]?.asset.symbol).toBe("SOL");
  });
});

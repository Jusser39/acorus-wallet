import { describe, expect, it } from "vitest";
import { buildFallbackNativeAsset } from "./send-assets";

describe("buildFallbackNativeAsset", () => {
  it("creates EVM native with 18 decimals", () => {
    const asset = buildFallbackNativeAsset({ family: "evm", chainId: 1, symbol: "ETH" });
    expect(asset.decimals).toBe(18);
    expect(asset.type).toBe("native");
    expect(asset.symbol).toBe("ETH");
    expect(asset.tokenAddress).toBeNull();
  });

  it("creates Solana native with 9 decimals", () => {
    const asset = buildFallbackNativeAsset({ family: "solana", chainId: 101, symbol: "SOL" });
    expect(asset.decimals).toBe(9);
    expect(asset.type).toBe("native");
  });

  it("creates Tron native with 6 decimals", () => {
    const asset = buildFallbackNativeAsset({
      family: "tron",
      chainId: "tron-mainnet",
      symbol: "TRX",
    });
    expect(asset.decimals).toBe(6);
    expect(asset.type).toBe("native");
  });

  it("creates UTXO asset with 8 decimals and utxo type", () => {
    const asset = buildFallbackNativeAsset({
      family: "utxo",
      chainId: "bitcoin-mainnet",
      symbol: "BTC",
    });
    expect(asset.decimals).toBe(8);
    expect(asset.type).toBe("utxo");
  });
});

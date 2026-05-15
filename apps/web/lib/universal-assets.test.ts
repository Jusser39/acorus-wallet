import { describe, expect, it } from "vitest";
import {
  createUniversalAssetId,
  getAssetTypeLabel,
  getChainFamilyLabel,
  getUnsupportedActionText,
  isSkeletonFamily,
} from "./universal-assets";

describe("createUniversalAssetId", () => {
  it("creates deterministic id for native EVM", () => {
    const id = createUniversalAssetId({
      family: "evm",
      chainId: 1,
      tokenAddress: null,
      symbol: "ETH",
      type: "native",
    });
    expect(id).toBe("evm:1:native:native:ETH");
  });

  it("creates deterministic id for Solana SPL token", () => {
    const id = createUniversalAssetId({
      family: "solana",
      chainId: 101,
      tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      symbol: "USDC",
      type: "spl",
    });
    expect(id).toBe("solana:101:spl:epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v:USDC");
  });
});

describe("getAssetTypeLabel", () => {
  it("returns correct labels", () => {
    expect(getAssetTypeLabel("native")).toBe("Native");
    expect(getAssetTypeLabel("erc20")).toBe("ERC-20");
    expect(getAssetTypeLabel("spl")).toBe("SPL");
    expect(getAssetTypeLabel("trc20")).toBe("TRC-20");
    expect(getAssetTypeLabel("utxo")).toBe("UTXO");
  });
});

describe("getChainFamilyLabel", () => {
  it("returns correct labels", () => {
    expect(getChainFamilyLabel("evm")).toBe("EVM");
    expect(getChainFamilyLabel("solana")).toBe("Solana");
    expect(getChainFamilyLabel("tron")).toBe("Tron");
    expect(getChainFamilyLabel("utxo")).toBe("Bitcoin");
    expect(getChainFamilyLabel("ton")).toBe("TON");
  });
});

describe("isSkeletonFamily", () => {
  it("returns true for tron, utxo, ton", () => {
    expect(isSkeletonFamily("tron")).toBe(true);
    expect(isSkeletonFamily("utxo")).toBe(true);
    expect(isSkeletonFamily("ton")).toBe(true);
  });

  it("returns false for evm and solana", () => {
    expect(isSkeletonFamily("evm")).toBe(false);
    expect(isSkeletonFamily("solana")).toBe(false);
  });
});

describe("getUnsupportedActionText", () => {
  it("returns family-specific messages", () => {
    expect(getUnsupportedActionText("solana")).toMatch(/solana/i);
    expect(getUnsupportedActionText("tron")).toMatch(/tron/i);
    expect(getUnsupportedActionText("utxo")).toMatch(/bitcoin/i);
    expect(getUnsupportedActionText("ton")).toMatch(/ton/i);
  });
});

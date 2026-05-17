import { describe, expect, it } from "vitest";
import { filterNfts, getNftActionLabel, getNftsForFamily, summarizeNfts } from "./nft";

describe("nft view model", () => {
  it("returns family-scoped collectibles", () => {
    expect(getNftsForFamily("evm").every((item) => item.family === "evm")).toBe(true);
    expect(getNftsForFamily("solana").every((item) => item.family === "solana")).toBe(true);
    expect(getNftsForFamily("tron")).toEqual([]);
  });

  it("filters spam and sendable items", () => {
    const evm = getNftsForFamily("evm");

    expect(filterNfts(evm, "spam")).toHaveLength(1);
    expect(filterNfts(evm, "sendable").every((item) => !item.isSpam)).toBe(true);
  });

  it("summarizes collection readiness", () => {
    const summary = summarizeNfts(getNftsForFamily(null));

    expect(summary.total).toBeGreaterThan(0);
    expect(summary.verified).toBeGreaterThan(0);
    expect(summary.previewOnly).toBeGreaterThan(0);
  });

  it("labels staged NFT actions", () => {
    expect(getNftActionLabel("preview", "send")).toBe("Preview send");
    expect(getNftActionLabel("disabled", "burn")).toBe("Burn disabled");
  });
});

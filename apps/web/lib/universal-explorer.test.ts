import { describe, expect, it } from "vitest";
import { getUniversalTokenExplorerUrl } from "./universal-explorer";

describe("universal explorer links", () => {
  it("falls back to chain config explorer URLs for newer EVM networks", () => {
    expect(
      getUniversalTokenExplorerUrl({
        family: "evm",
        chainId: 8453,
        tokenAddress: "0xacfe6019ed1a7dc6f7b508c02d1b04ec88cc21bf",
      }),
    ).toBe("https://basescan.org/address/0xacfe6019ed1a7dc6f7b508c02d1b04ec88cc21bf");
  });
});

import { describe, expect, it } from "vitest";
import {
  canNetworkBroadcast,
  createSendAssetOptionId,
  getSendStatusLabel,
} from "./send-ui";

describe("createSendAssetOptionId", () => {
  it("produces stable id for native EVM", () => {
    const id = createSendAssetOptionId({
      family: "evm",
      chainId: 1,
      symbol: "ETH",
      tokenAddress: null,
    });
    expect(id).toBe("evm:1:ETH:native");
  });

  it("produces stable id for ERC-20", () => {
    const id = createSendAssetOptionId({
      family: "evm",
      chainId: 1,
      symbol: "USDC",
      tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    });
    expect(id).toContain("evm:1:USDC:");
    expect(id).toContain("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
  });

  it("normalises symbol to uppercase", () => {
    const id = createSendAssetOptionId({
      family: "solana",
      chainId: 101,
      symbol: "sol",
    });
    expect(id).toContain(":SOL:");
  });
});

describe("getSendStatusLabel", () => {
  it("labels supported networks", () => {
    expect(getSendStatusLabel("supported")).toBe("Send supported");
  });

  it("labels coming_soon networks", () => {
    expect(getSendStatusLabel("coming_soon")).toBe("Coming soon");
  });

  it("labels skeleton networks", () => {
    expect(getSendStatusLabel("skeleton")).toBe("Skeleton");
  });
});

describe("canNetworkBroadcast", () => {
  it("returns true for supported", () => {
    expect(canNetworkBroadcast("supported")).toBe(true);
  });

  it("returns false for coming_soon", () => {
    expect(canNetworkBroadcast("coming_soon")).toBe(false);
  });

  it("returns false for skeleton", () => {
    expect(canNetworkBroadcast("skeleton")).toBe(false);
  });
});

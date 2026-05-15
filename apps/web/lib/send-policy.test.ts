import { describe, expect, it } from "vitest";
import { canWalletSend, isSafetyModeBlockingRealSend, getSendAvailability } from "./send-policy";

describe("send policy", () => {
  it("blocks view-only wallets from sending", () => {
    expect(canWalletSend("view_only", true)).toBe(false);
  });

  it("requires unlock for local wallets", () => {
    expect(canWalletSend("local", false)).toBe(false);
    expect(canWalletSend("local", true)).toBe(true);
  });

  it("allows practice wallets to send fake transactions", () => {
    expect(canWalletSend("practice", false)).toBe(true);
  });

  it("blocks real send while safety mode is enabled", () => {
    expect(isSafetyModeBlockingRealSend("local", true)).toBe(true);
    expect(isSafetyModeBlockingRealSend("local", false)).toBe(false);
    expect(isSafetyModeBlockingRealSend("practice", true)).toBe(false);
  });
});

describe("getSendAvailability", () => {
  it("returns canSend=true for EVM local unlocked", () => {
    const result = getSendAvailability({
      profileType: "local",
      chainFamily: "evm",
      isUnlocked: true,
    });
    expect(result.canSend).toBe(true);
  });

  it("returns canSend=false for view_only on any family", () => {
    for (const family of ["evm", "solana", "tron", "utxo"] as const) {
      expect(
        getSendAvailability({ profileType: "view_only", chainFamily: family, isUnlocked: true }).canSend,
      ).toBe(false);
    }
  });

  it("returns canSend=false for Solana local wallet (not implemented)", () => {
    const result = getSendAvailability({
      profileType: "local",
      chainFamily: "solana",
      isUnlocked: true,
    });
    expect(result.canSend).toBe(false);
    expect(result.ctaLabel).toMatch(/solana/i);
  });

  it("returns canSend=false for Tron and Bitcoin", () => {
    expect(
      getSendAvailability({ profileType: "local", chainFamily: "tron", isUnlocked: true }).canSend,
    ).toBe(false);
    expect(
      getSendAvailability({ profileType: "local", chainFamily: "utxo", isUnlocked: true }).canSend,
    ).toBe(false);
  });

  it("returns canSend=false for locked EVM wallet", () => {
    const result = getSendAvailability({
      profileType: "local",
      chainFamily: "evm",
      isUnlocked: false,
    });
    expect(result.canSend).toBe(false);
  });

  it("returns canSend=false when safetyMode is enabled on EVM", () => {
    const result = getSendAvailability({
      profileType: "local",
      chainFamily: "evm",
      isUnlocked: true,
      safetyMode: true,
    });
    expect(result.canSend).toBe(false);
  });

  it("returns canSend=true for EVM practice wallet", () => {
    const result = getSendAvailability({
      profileType: "practice",
      chainFamily: "evm",
      isUnlocked: false,
    });
    expect(result.canSend).toBe(true);
  });
});

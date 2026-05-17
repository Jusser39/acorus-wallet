import { describe, expect, it } from "vitest";
import { buildWalletHealthSummary } from "./wallet-health";
import type { WalletProfileRecord } from "@acorus/shared";

const baseProfile: WalletProfileRecord = {
  id: "profile-1",
  userId: "user-1",
  name: "Main",
  type: "local",
  publicAddress: "0x0000000000000000000000000000000000000000",
  chainFamily: "evm",
  hiddenBalance: false,
  preferredCurrency: "USD",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("wallet health summary", () => {
  it("marks a fully unlocked local EVM profile as ready", () => {
    const summary = buildWalletHealthSummary({
      profile: baseProfile,
      isUnlocked: true,
      safetyMode: false,
      hasEncryptedVault: true,
    });

    expect(summary.label).toBe("Ready");
    expect(summary.score).toBe(100);
  });

  it("flags locked local wallets and safety mode", () => {
    const summary = buildWalletHealthSummary({
      profile: baseProfile,
      isUnlocked: false,
      safetyMode: true,
      hasEncryptedVault: true,
    });

    expect(summary.score).toBeLessThan(85);
    expect(summary.issues.map((issue) => issue.id)).toEqual(["locked", "safety-mode"]);
  });

  it("identifies Tron as a receive/view-only preview chain", () => {
    const summary = buildWalletHealthSummary({
      profile: {
        ...baseProfile,
        type: "view_only",
        chainFamily: "tron",
        publicAddress: "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj",
      },
      isUnlocked: false,
      safetyMode: true,
      hasEncryptedVault: false,
    });

    expect(summary.issues.some((issue) => issue.id === "skeleton-chain")).toBe(true);
    expect(summary.issues.some((issue) => issue.id === "view-only")).toBe(true);
  });
});

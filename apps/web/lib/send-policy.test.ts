import { describe, expect, it } from "vitest";
import { canWalletSend, isSafetyModeBlockingRealSend } from "./send-policy";

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

import { describe, expect, it } from "vitest";
import { getSwapCtaLabel, type SwapCtaState } from "./swap-cta";

const base: SwapCtaState = {
  extensionDetected: true,
  connected: true,
  quoteLoading: false,
  quoteReady: false,
  approvalRequired: false,
  wrongChain: false,
  quoteExpired: false,
  hasAmount: true,
};

describe("swap CTA labels", () => {
  it("prioritizes missing extension and wallet connection", () => {
    expect(getSwapCtaLabel({ ...base, extensionDetected: false })).toBe("Install Acorus Extension");
    expect(getSwapCtaLabel({ ...base, connected: false })).toBe("Connect wallet");
  });

  it("handles quote and route states", () => {
    expect(getSwapCtaLabel({ ...base, quoteLoading: true })).toBe("Finding best route...");
    expect(getSwapCtaLabel({ ...base, quoteReady: false })).toBe("Get quote");
    expect(getSwapCtaLabel({ ...base, quoteReady: true, quoteExpired: true })).toBe("Refresh quote");
  });

  it("handles review blockers and approval state", () => {
    expect(getSwapCtaLabel({ ...base, quoteReady: true, wrongChain: true })).toBe("Switch network");
    expect(getSwapCtaLabel({ ...base, quoteReady: true, approvalRequired: true })).toBe("Approve token");
    expect(getSwapCtaLabel({ ...base, quoteReady: true })).toBe("Review swap");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { appendSwapHistoryEntry, loadSwapHistory } from "./swap-history";

describe("swap history", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("stores local swap activity without raw calldata", () => {
    appendSwapHistoryEntry({
      id: "swap_1",
      kind: "swap_requested",
      provider: "0x",
      chainId: 1,
      account: "0x0000000000000000000000000000000000000001",
      sellTokenSymbol: "ETH",
      buyTokenSymbol: "USDC",
      amountFormatted: "0.01",
      buyAmountFormatted: "25",
      status: "queued",
      createdAt: "2026-05-19T00:00:00.000Z",
      updatedAt: "2026-05-19T00:00:00.000Z",
    });

    const stored = window.localStorage.getItem("acorus.swap.history");
    expect(stored).toContain("swap_requested");
    expect(stored).not.toContain("\"data\":");
    expect(loadSwapHistory()).toHaveLength(1);
  });
});

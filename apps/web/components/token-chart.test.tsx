import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TokenChart } from "./token-chart";
import type { MarketChart } from "@/lib/api";

const chart: MarketChart = {
  chainId: 1,
  symbol: "ETH",
  currency: "USD",
  range: "1D",
  points: [
    { timestamp: "2026-05-23T10:00:00.000Z", price: 10 },
    { timestamp: "2026-05-23T12:30:00.000Z", price: 11 },
    { timestamp: "2026-05-23T15:00:00.000Z", price: 12 },
  ],
  provider: "test",
  updatedAt: "2026-05-23T15:00:00.000Z",
};

describe("TokenChart", () => {
  it("shows price, timestamp, and percent while inspecting the chart", () => {
    const { container } = render(<TokenChart chart={chart} loading={false} symbol="ETH" />);
    const svg = container.querySelector("svg");

    expect(svg).toBeTruthy();

    vi.spyOn(svg!, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 860,
      height: 260,
      right: 860,
      bottom: 260,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.mouseMove(svg!, { clientX: 430 });

    expect(screen.getAllByText(/11[,.]00/).length).toBeGreaterThan(0);
    expect(screen.getByText("+10.00%")).toBeTruthy();
    expect(screen.getByText("+10.00% from range start")).toBeTruthy();
    expect(screen.getAllByText(/May .*2026/i).length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { buildFearGreedPulse } from "./market-pulse";

describe("buildFearGreedPulse", () => {
  it("returns neutral when no market changes are available", () => {
    const pulse = buildFearGreedPulse([]);

    expect(pulse.score).toBe(50);
    expect(pulse.label).toBe("Neutral");
  });

  it("detects greed from positive breadth and positive average", () => {
    const pulse = buildFearGreedPulse([
      { id: "a", source: "coingecko", name: "A", symbol: "A", price: 1, change24h: 4, marketCapUsd: null, volume24hUsd: null, logoUrl: null },
      { id: "b", source: "coingecko", name: "B", symbol: "B", price: 1, change24h: 3, marketCapUsd: null, volume24hUsd: null, logoUrl: null },
    ]);

    expect(pulse.score).toBeGreaterThan(58);
    expect(pulse.label).toMatch(/greed/iu);
  });

  it("detects fear from negative breadth and negative average", () => {
    const pulse = buildFearGreedPulse([
      { id: "a", source: "coingecko", name: "A", symbol: "A", price: 1, change24h: -5, marketCapUsd: null, volume24hUsd: null, logoUrl: null },
      { id: "b", source: "coingecko", name: "B", symbol: "B", price: 1, change24h: -2, marketCapUsd: null, volume24hUsd: null, logoUrl: null },
    ]);

    expect(pulse.score).toBeLessThan(42);
    expect(pulse.label).toMatch(/fear/iu);
  });
});

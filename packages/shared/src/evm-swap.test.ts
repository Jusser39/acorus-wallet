import { describe, expect, it } from "vitest";
import {
  buildNativeEvmTokenMetadata,
  formatEvmTokenAmount,
  getCuratedEvmTokenMetadata,
  normalizeEvmTokenAmount,
  shortenFormattedEvmTokenAmount,
  validateFormattedAmount,
} from "./evm-swap";

describe("evm swap helpers", () => {
  it("builds native metadata from chain config", () => {
    expect(buildNativeEvmTokenMetadata(1)).toMatchObject({
      chainId: 1,
      address: "native",
      symbol: "ETH",
      source: "native",
      verified: true,
    });
  });

  it("returns curated metadata when available", () => {
    expect(
      getCuratedEvmTokenMetadata(1, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"),
    ).toMatchObject({
      symbol: "USDC",
      decimals: 6,
      source: "curated",
      verified: true,
    });
  });

  it("normalizes formatted amounts without number precision loss", () => {
    expect(normalizeEvmTokenAmount("1", 6)).toBe("1000000");
    expect(normalizeEvmTokenAmount("1", 18)).toBe("1000000000000000000");
    expect(normalizeEvmTokenAmount("0.001", 18)).toBe("1000000000000000");
  });

  it("formats raw amounts back to decimal strings", () => {
    expect(formatEvmTokenAmount("1000000", 6)).toBe("1");
    expect(formatEvmTokenAmount("1000000000000000000", 18)).toBe("1");
    expect(formatEvmTokenAmount("1000000000000000", 18)).toBe("0.001");
    expect(shortenFormattedEvmTokenAmount("1234567890000000000", 18, 4)).toBe("1.2345");
  });

  it("validates formatted inputs before conversion", () => {
    expect(validateFormattedAmount("1.25")).toBe(true);
    expect(validateFormattedAmount("0")).toBe(false);
    expect(validateFormattedAmount("1.2.3")).toBe(false);
    expect(validateFormattedAmount("abc")).toBe(false);
  });

  it("rejects invalid or too precise decimal amounts", () => {
    expect(() => normalizeEvmTokenAmount("abc", 6)).toThrow("Invalid amount format.");
    expect(() => normalizeEvmTokenAmount("1.0000001", 6)).toThrow("Amount has more than 6 decimals.");
    expect(() => normalizeEvmTokenAmount("0", 18)).toThrow("Amount must be greater than zero.");
  });
});

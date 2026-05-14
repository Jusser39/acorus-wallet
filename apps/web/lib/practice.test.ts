import { describe, expect, it } from "vitest";
import { PRACTICE_LESSONS, getPracticeNativeBalance, getPracticeTokens } from "./practice";

describe("practice helpers", () => {
  it("returns seeded lessons", () => {
    expect(PRACTICE_LESSONS.length).toBeGreaterThan(0);
  });

  it("returns fake balances for configured chains", () => {
    expect(Number(getPracticeNativeBalance(1))).toBeGreaterThan(0);
    expect(getPracticeTokens(137)[0]?.symbol).toBe("USDC");
  });
});

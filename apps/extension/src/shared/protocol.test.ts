import { describe, expect, it } from "vitest";
import {
  ACORUS_PROVIDER_METHODS,
  createSkeletonState,
  isAcorusProviderMethod,
} from "./protocol";

describe("extension protocol", () => {
  it("recognizes supported internal provider methods", () => {
    expect(isAcorusProviderMethod("acorus_ping")).toBe(true);
    expect(isAcorusProviderMethod("eth_requestAccounts")).toBe(false);
    expect(ACORUS_PROVIDER_METHODS).toContain("acorus_requestAccounts");
  });

  it("creates a skeleton state with execution disabled", () => {
    const state = createSkeletonState({
      activeOrigin: "https://app.example",
    });

    expect(state.phase).toBe("permission_shell");
    expect(state.executionEnabled).toBe(false);
    expect(state.activeOrigin).toBe("https://app.example");
    expect(state.proposals).toEqual([]);
    expect(state.pendingRequests).toEqual([]);
  });
});

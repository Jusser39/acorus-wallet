import { describe, expect, it } from "vitest";
import {
  ACORUS_PROVIDER_METHODS,
  createSkeletonState,
  isInpageStateEnvelope,
  isAcorusProviderMethod,
} from "./protocol";

describe("extension protocol", () => {
  it("recognizes supported internal provider methods", () => {
    expect(isAcorusProviderMethod("acorus_ping")).toBe(true);
    expect(isAcorusProviderMethod("acorus_signMessage")).toBe(true);
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

  it("recognizes bridge state envelopes", () => {
    expect(
      isInpageStateEnvelope({
        type: "acorus:inpage-state",
        state: {
          origin: "https://app.example",
          status: "disconnected",
          providerMode: "stub_only",
          accounts: [],
          chainIds: [],
          activeChainId: null,
          permissions: [],
          updatedAt: "2026-05-16T00:00:00.000Z",
        },
      }),
    ).toBe(true);
  });
});

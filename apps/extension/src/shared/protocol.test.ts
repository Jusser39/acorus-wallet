import { describe, expect, it } from "vitest";
import {
  ACORUS_PROVIDER_METHODS,
  createConnectedSitePermission,
  createSkeletonState,
  isAcorusProviderMethod,
} from "./protocol";

describe("extension protocol", () => {
  it("recognizes supported internal provider methods", () => {
    expect(isAcorusProviderMethod("acorus_ping")).toBe(true);
    expect(isAcorusProviderMethod("eth_requestAccounts")).toBe(false);
    expect(ACORUS_PROVIDER_METHODS).toContain("acorus_requestAccounts");
  });

  it("creates deduplicated connected site permissions", () => {
    const permission = createConnectedSitePermission({
      origin: "https://app.example",
      accounts: ["0xabc", "0xabc"],
      chainIds: [1, 1],
      methods: ["acorus_accounts", "acorus_accounts"],
    });

    expect(permission.accounts).toEqual(["0xabc"]);
    expect(permission.chainIds).toEqual([1]);
    expect(permission.methods).toEqual(["acorus_accounts"]);
  });

  it("creates a skeleton state with execution disabled", () => {
    const state = createSkeletonState({
      activeOrigin: "https://app.example",
    });

    expect(state.phase).toBe("skeleton");
    expect(state.executionEnabled).toBe(false);
    expect(state.activeOrigin).toBe("https://app.example");
  });
});

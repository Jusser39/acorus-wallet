import { describe, expect, it } from "vitest";
import {
  createWebDappShellPreview,
  formatDappPermissionList,
  getDappTrustLabel,
} from "./dapp-shell";

describe("dapp shell helpers", () => {
  it("creates a preview state with proposals, sessions and requests", () => {
    const state = createWebDappShellPreview();

    expect(state.proposals.length).toBeGreaterThan(0);
    expect(state.sessions.length).toBeGreaterThan(0);
    expect(state.pendingRequests.length).toBeGreaterThan(0);
  });

  it("formats permission labels", () => {
    expect(formatDappPermissionList(["view_accounts", "sign_message"])).toContain(
      "View accounts",
    );
  });

  it("maps trust levels to readable labels", () => {
    expect(getDappTrustLabel("warning")).toBe("Review carefully");
  });
});

import { describe, expect, it } from "vitest";
import {
  createWebDappShellPreview,
  formatDappPermissionList,
  queuePreviewSessionRequest,
  queuePreviewWalletConnectPairing,
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

  it("queues a redacted WalletConnect preview pairing", () => {
    const state = queuePreviewWalletConnectPairing(createWebDappShellPreview(), {
      uri: "wc:0123456789abcdef@2?relay-protocol=irn&symKey=super-secret-key",
      title: "Universal Swap",
    });

    expect(state.proposals[0]?.transport).toBe("walletconnect");
    expect(state.proposals[0]?.origin.title).toBe("Universal Swap");
    expect(state.proposals[0]?.origin.origin).not.toContain("super-secret-key");
  });

  it("queues a preview request for an active session", () => {
    const base = createWebDappShellPreview();
    const session = base.sessions[0];
    const state = queuePreviewSessionRequest(base, {
      sessionId: session!.id,
      kind: "send_transaction",
      chainId: 137,
    });

    expect(state.pendingRequests[0]?.transport).toBe(session!.transport);
    expect(state.pendingRequests[0]?.chainId).toBe(137);
  });
});

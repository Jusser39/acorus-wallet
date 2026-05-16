import { describe, expect, it } from "vitest";
import {
  approveDappProposal,
  createApprovedPreviewDappResult,
  createDemoDappShellSnapshot,
  createDappBridgeSessionView,
  ensureDappConnectionProposal,
  queueDappRequest,
  setDappSessionActiveChain,
} from "./dapp";

describe("dapp helpers", () => {
  it("creates approval-required bridge state for a new origin proposal", () => {
    const base = createDemoDappShellSnapshot();
    const ensured = ensureDappConnectionProposal(base, {
      origin: "https://app.example",
    });
    const bridge = createDappBridgeSessionView(
      ensured.snapshot,
      "https://app.example",
    );

    expect(ensured.created).toBe(true);
    expect(bridge.status).toBe("approval_required");
    expect(bridge.proposalId).toBeTruthy();
  });

  it("creates connected bridge state after proposal approval", () => {
    const base = createDemoDappShellSnapshot();
    const ensured = ensureDappConnectionProposal(base, {
      origin: "https://app.example",
    });
    const approved = approveDappProposal(ensured.snapshot, ensured.proposal.id);
    const bridge = createDappBridgeSessionView(approved, "https://app.example");

    expect(bridge.status).toBe("connected");
    expect(bridge.accounts.length).toBeGreaterThan(0);
    expect(bridge.activeChainId).toBe(1);
  });

  it("updates the active chain for an approved session", () => {
    const base = createDemoDappShellSnapshot();
    const ensured = ensureDappConnectionProposal(base, {
      origin: "https://app.example",
      requestedChainIds: [1, 137],
    });
    const approved = approveDappProposal(ensured.snapshot, ensured.proposal.id);
    const session = approved.sessions.find(
      (item) => item.origin.origin === "https://app.example",
    );

    expect(session).toBeTruthy();

    const switched = setDappSessionActiveChain(approved, session!.id, 137);
    const bridge = createDappBridgeSessionView(switched, "https://app.example");

    expect(bridge.activeChainId).toBe(137);
  });

  it("queues a provider request and builds an approved preview result", () => {
    const base = createDemoDappShellSnapshot();
    const session = base.sessions[0];
    const queued = queueDappRequest(base, {
      id: "request_live_sign_message",
      sessionId: session.id,
      kind: "sign_message",
      origin: session.origin.origin,
      account: session.accounts[0],
      chainId: 1,
      summary: "Sign a login message.",
    });

    expect(queued.created).toBe(true);
    expect(queued.snapshot.pendingRequests[0]?.id).toBe("request_live_sign_message");

    const result = createApprovedPreviewDappResult(
      queued.request,
      "2026-05-16T00:00:00.000Z",
    );

    expect(result.status).toBe("approved_preview");
    expect(result.signature).toBeNull();
  });
});

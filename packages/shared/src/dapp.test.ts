import { describe, expect, it } from "vitest";
import {
  approveDappProposal,
  createDemoDappShellSnapshot,
  createDappBridgeSessionView,
  ensureDappConnectionProposal,
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
});

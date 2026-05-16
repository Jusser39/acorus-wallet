import {
  EXTENSION_PHASES,
  createRequestId,
  createSkeletonState,
  type BackgroundStateSnapshot,
  type ExtensionRuntimeResponse,
} from "../shared/protocol";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Popup root not found.");
}

void loadPopupState();

async function loadPopupState(): Promise<void> {
  let state = createSkeletonState();

  try {
    const response = (await chrome.runtime.sendMessage({
      kind: "get_state",
      requestId: createRequestId("popup"),
      surface: "popup",
      origin: null,
    })) as ExtensionRuntimeResponse;

    if (response.ok && response.result) {
      state = response.result as BackgroundStateSnapshot;
    }
  } catch {
    state = createSkeletonState();
  }

  root.innerHTML = renderPopup(state);
  wirePopupActions();
}

function renderPopup(state: BackgroundStateSnapshot): string {
  const bridge = state.activeOriginBridge;
  const proposals = state.proposals.length
    ? state.proposals
        .map(
          (proposal) => `
            <article style="border:1px solid rgba(51,65,85,1);border-radius:18px;padding:14px 16px;background:rgba(2,6,23,0.72);display:grid;gap:10px">
              <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
                <div>
                  <div style="font-weight:600;color:#fff">${escapeHtml(proposal.origin.title)}</div>
                  <div style="margin-top:4px;font-size:12px;color:#94a3b8">${escapeHtml(proposal.origin.origin)}</div>
                </div>
                <span style="${badgeStyle(proposal.origin.trustLevel === "trusted" ? "#10b981" : "#f59e0b")}">${proposal.origin.trustLevel}</span>
              </div>
              <div style="font-size:13px;color:#cbd5e1;line-height:1.5">
                Permissions: ${escapeHtml(proposal.requestedPermissions.join(", "))}
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${actionButton("approve-proposal", proposal.id, "Approve preview", true)}
                ${actionButton("reject-proposal", proposal.id, "Reject", false)}
              </div>
            </article>`,
        )
        .join("")
    : emptyCard("No connection proposals are waiting in the queue.");

  const requests = state.pendingRequests.length
    ? state.pendingRequests
        .map(
          (request) => `
            <article style="border:1px solid rgba(51,65,85,1);border-radius:18px;padding:14px 16px;background:rgba(2,6,23,0.72);display:grid;gap:10px">
              <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
                <div>
                  <div style="font-weight:600;color:#fff">${escapeHtml(request.kind)}</div>
                  <div style="margin-top:4px;font-size:12px;color:#94a3b8">${escapeHtml(request.origin.title)}</div>
                </div>
                <span style="${badgeStyle("#0ea5e9")}">${request.chainId ?? "multi"}</span>
              </div>
              <div style="font-size:13px;color:#cbd5e1;line-height:1.5">${escapeHtml(request.summary)}</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${actionButton("approve-request", request.id, "Approve preview", true)}
                ${actionButton("reject-request", request.id, "Reject", false)}
              </div>
            </article>`,
        )
        .join("")
    : emptyCard("No signing or transaction prompts are waiting.");

  const sessions = state.sessions.length
    ? state.sessions
        .map(
          (session) => `
            <article style="border:1px solid rgba(51,65,85,1);border-radius:18px;padding:14px 16px;background:rgba(2,6,23,0.72);display:grid;gap:10px">
              <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
                <div>
                  <div style="font-weight:600;color:#fff">${escapeHtml(session.origin.title)}</div>
                  <div style="margin-top:4px;font-size:12px;color:#94a3b8">${escapeHtml(session.origin.origin)}</div>
                </div>
                <span style="${badgeStyle(session.status === "active" ? "#10b981" : "#ef4444")}">${session.status}</span>
              </div>
              <div style="font-size:13px;color:#cbd5e1;line-height:1.5">
                Permissions: ${escapeHtml(session.permissions.join(", "))}
              </div>
              ${
                session.status === "active"
                  ? `<div>${actionButton("revoke-session", session.id, "Revoke session", false)}</div>`
                  : ""
              }
            </article>`,
        )
        .join("")
    : emptyCard("No connected sites are stored.");

  const approvals = state.approvalResults.length
    ? state.approvalResults
        .slice(0, 4)
        .map(
          (result) => `
            <article style="border:1px solid rgba(51,65,85,1);border-radius:18px;padding:12px 14px;background:rgba(2,6,23,0.72)">
              <div style="display:flex;justify-content:space-between;gap:12px">
                <div style="font-size:13px;color:#fff">${result.decision} ${result.targetKind}</div>
                <div style="font-size:12px;color:#94a3b8">${escapeHtml(result.targetId)}</div>
              </div>
            </article>`,
        )
        .join("")
    : emptyCard("No decisions recorded yet.");

  const phases = EXTENSION_PHASES.map(
    (phase, index) => `
      <div style="display:flex;justify-content:space-between;gap:12px;border:1px solid rgba(51,65,85,1);border-radius:18px;padding:14px 16px;background:rgba(15,23,42,0.88)">
        <div>
          <div style="font-size:12px;color:#94a3b8">Phase ${index + 1}</div>
          <div style="font-weight:600;color:#fff;margin-top:4px">${phase}</div>
        </div>
        <span style="align-self:flex-start;border:1px solid rgba(56,189,248,0.35);background:rgba(14,165,233,0.12);color:#bae6fd;border-radius:999px;padding:3px 8px;font-size:12px">${index < 4 ? "Preview" : "Later"}</span>
      </div>`,
  ).join("");

  return `
    <main style="padding:20px;display:flex;flex-direction:column;gap:16px">
      <section style="border:1px solid rgba(71,85,105,0.5);background:rgba(15,23,42,0.9);border-radius:24px;padding:18px">
        <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8">Acorus Wallet</div>
        <h1 style="margin:10px 0 0;font-size:24px;line-height:1.2">Universal dApp permission shell</h1>
        <p style="margin:10px 0 0;color:#cbd5e1;font-size:14px;line-height:1.5">
          The live bridge now supports connect, accounts, chainId, and switchChain in preview-backed mode. Signing, transaction review, and broadcast still remain disabled.
        </p>
      </section>

      <section style="display:grid;gap:12px;grid-template-columns:repeat(4,minmax(0,1fr))">
        <div style="border:1px solid rgba(16,185,129,0.35);background:rgba(16,185,129,0.12);color:#d1fae5;border-radius:18px;padding:14px 16px;font-size:14px">
          Execution enabled: <strong>${String(state.executionEnabled)}</strong>
        </div>
        <div style="border:1px solid rgba(245,158,11,0.35);background:rgba(245,158,11,0.12);color:#fde68a;border-radius:18px;padding:14px 16px;font-size:14px">
          Proposals: <strong>${state.proposals.length}</strong>
        </div>
        <div style="border:1px solid rgba(56,189,248,0.35);background:rgba(14,165,233,0.12);color:#bae6fd;border-radius:18px;padding:14px 16px;font-size:14px">
          Requests: <strong>${state.pendingRequests.length}</strong>
        </div>
        <div style="border:1px solid rgba(168,85,247,0.35);background:rgba(168,85,247,0.12);color:#e9d5ff;border-radius:18px;padding:14px 16px;font-size:14px">
          Bridge: <strong>${bridge?.status ?? "disconnected"}</strong>
        </div>
      </section>

      <section style="border:1px solid rgba(51,65,85,1);border-radius:18px;padding:14px 16px;background:rgba(15,23,42,0.88);display:grid;gap:8px">
        <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8">Active origin bridge</div>
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div style="font-size:14px;color:#fff">${escapeHtml(bridge?.origin ?? "No active origin")}</div>
          <span style="${badgeStyle(bridge?.status === "connected" ? "#10b981" : bridge?.status === "approval_required" ? "#f59e0b" : "#64748b")}">${bridge?.status ?? "disconnected"}</span>
        </div>
        <div style="font-size:13px;color:#cbd5e1;line-height:1.5">
          Provider mode: <strong>${escapeHtml(bridge?.providerMode ?? "stub_only")}</strong> · Active chain: <strong>${escapeHtml(String(bridge?.activeChainId ?? "n/a"))}</strong>
        </div>
        <div style="font-size:13px;color:#cbd5e1;line-height:1.5">
          Methods live now: <strong>acorus_requestAccounts</strong>, <strong>acorus_accounts</strong>, <strong>acorus_chainId</strong>, <strong>acorus_switchChain</strong>
        </div>
        <div style="font-size:12px;color:#94a3b8;line-height:1.5">${escapeHtml(bridge?.warning ?? "The bridge is idle until a site requests approval.")}</div>
      </section>

      <section style="display:grid;gap:12px">
        <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8">Connection proposals</div>
        ${proposals}
      </section>

      <section style="display:grid;gap:12px">
        <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8">Request queue</div>
        ${requests}
      </section>

      <section style="display:grid;gap:12px">
        <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8">Connected sites</div>
        ${sessions}
      </section>

      <section style="display:grid;gap:12px">
        <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8">Recent decisions</div>
        ${approvals}
      </section>

      <section style="display:grid;gap:10px">
        ${phases}
      </section>
    </main>
  `;
}

function wirePopupActions(): void {
  const buttons = root.querySelectorAll<HTMLButtonElement>("[data-action]");

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.action;
      const targetId = button.dataset.id;

      if (!action || !targetId) {
        return;
      }

      button.disabled = true;

      try {
        await sendAction(action, targetId);
      } finally {
        await loadPopupState();
      }
    });
  });
}

async function sendAction(action: string, targetId: string): Promise<void> {
  if (action === "approve-proposal") {
    await chrome.runtime.sendMessage({
      kind: "approve_proposal",
      requestId: createRequestId("popup"),
      surface: "popup",
      proposalId: targetId,
    });
    return;
  }

  if (action === "reject-proposal") {
    await chrome.runtime.sendMessage({
      kind: "reject_proposal",
      requestId: createRequestId("popup"),
      surface: "popup",
      proposalId: targetId,
    });
    return;
  }

  if (action === "approve-request") {
    await chrome.runtime.sendMessage({
      kind: "approve_request",
      requestId: createRequestId("popup"),
      surface: "popup",
      requestIdTarget: targetId,
    });
    return;
  }

  if (action === "reject-request") {
    await chrome.runtime.sendMessage({
      kind: "reject_request",
      requestId: createRequestId("popup"),
      surface: "popup",
      requestIdTarget: targetId,
    });
    return;
  }

  if (action === "revoke-session") {
    await chrome.runtime.sendMessage({
      kind: "revoke_session",
      requestId: createRequestId("popup"),
      surface: "popup",
      sessionId: targetId,
    });
  }
}

function actionButton(
  action: string,
  id: string,
  label: string,
  primary: boolean,
): string {
  return `<button data-action="${action}" data-id="${id}" style="border:1px solid ${primary ? "rgba(56,189,248,0.35)" : "rgba(71,85,105,0.7)"};background:${primary ? "rgba(14,165,233,0.12)" : "rgba(2,6,23,0.75)"};color:${primary ? "#bae6fd" : "#e2e8f0"};border-radius:999px;padding:8px 12px;font-size:12px;cursor:pointer">${label}</button>`;
}

function emptyCard(message: string): string {
  return `<div style="border:1px dashed rgba(71,85,105,0.8);border-radius:18px;padding:14px 16px;background:rgba(2,6,23,0.42);color:#94a3b8;font-size:13px">${message}</div>`;
}

function badgeStyle(color: string): string {
  return `align-self:flex-start;border:1px solid ${color}55;background:${color}22;color:#e2e8f0;border-radius:999px;padding:3px 8px;font-size:12px`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

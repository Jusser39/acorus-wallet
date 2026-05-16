import {
  DAPP_PERMISSION_DEFINITIONS,
  getDappRequestKindLabel,
  getDappSessionStatusLabel,
} from "@acorus/shared";
import { EVM_COMPATIBILITY_METHODS } from "../shared/evm-compat";
import {
  EXTENSION_PHASES,
  createRequestId,
  createSkeletonState,
  type BackgroundStateSnapshot,
  type ExtensionRuntimeResponse,
} from "../shared/protocol";

const root = getRoot("Options root not found.");

void loadOptionsState();

async function loadOptionsState(): Promise<void> {
  let state = createSkeletonState();

  try {
    const response = (await chrome.runtime.sendMessage({
      kind: "get_state",
      requestId: createRequestId("options"),
      surface: "options",
      origin: null,
    })) as ExtensionRuntimeResponse;

    if (response.ok && response.result) {
      state = response.result as BackgroundStateSnapshot;
    }
  } catch {
    state = createSkeletonState();
  }

  root.innerHTML = renderOptions(state);
  wireOptionActions();
}

function renderOptions(state: BackgroundStateSnapshot): string {
  const bridge = state.activeOriginBridge;
  return `
    <main style="max-width:1100px;margin:0 auto;padding:32px 20px 48px;display:flex;flex-direction:column;gap:20px">
      <section style="border:1px solid rgba(71,85,105,0.5);background:rgba(15,23,42,0.9);border-radius:28px;padding:24px">
        <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8">Acorus Extension</div>
        <h1 style="margin:12px 0 0;font-size:34px;line-height:1.15">Universal dApp permission shell</h1>
        <p style="margin:12px 0 0;color:#cbd5e1;font-size:15px;line-height:1.6">
          This options shell now mirrors the live bridge state. Connect, accounts, chainId, switchChain, common <code>window.ethereum</code> methods, and sign/transaction approval review can flow through the extension after approval. Public local EVM accounts can now sync from the Acorus web app, while real signing and send execution remain disabled.
        </p>
      </section>

      <section style="display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
        <div style="border:1px solid rgba(245,158,11,0.35);background:rgba(245,158,11,0.12);border-radius:24px;padding:20px;color:#fde68a">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.14em">Proposals</div>
          <div style="margin-top:10px;font-size:32px;font-weight:700">${state.proposals.length}</div>
        </div>
        <div style="border:1px solid rgba(14,165,233,0.35);background:rgba(14,165,233,0.12);border-radius:24px;padding:20px;color:#bae6fd">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.14em">Pending requests</div>
          <div style="margin-top:10px;font-size:32px;font-weight:700">${state.pendingRequests.length}</div>
        </div>
        <div style="border:1px solid rgba(16,185,129,0.35);background:rgba(16,185,129,0.12);border-radius:24px;padding:20px;color:#d1fae5">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.14em">Active sessions</div>
          <div style="margin-top:10px;font-size:32px;font-weight:700">${state.sessions.filter((session) => session.status === "active").length}</div>
        </div>
        <div style="border:1px solid rgba(168,85,247,0.35);background:rgba(168,85,247,0.12);border-radius:24px;padding:20px;color:#e9d5ff">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.14em">Bridge status</div>
          <div style="margin-top:10px;font-size:32px;font-weight:700">${escapeHtml(bridge?.status ?? "disconnected")}</div>
        </div>
      </section>

      <section style="border:1px solid rgba(51,65,85,1);background:rgba(15,23,42,0.88);border-radius:24px;padding:20px">
        <h2 style="margin:0 0 10px;font-size:20px">Active origin bridge</h2>
        <div style="display:grid;gap:8px">
          <div style="font-size:14px;color:#fff">${escapeHtml(bridge?.origin ?? "No active origin selected")}</div>
          <div style="font-size:14px;color:#cbd5e1">Provider mode: <strong>${escapeHtml(bridge?.providerMode ?? "stub_only")}</strong></div>
          <div style="font-size:14px;color:#cbd5e1">Active chain: <strong>${escapeHtml(String(bridge?.activeChainId ?? "n/a"))}</strong></div>
          <div style="font-size:14px;color:#cbd5e1">Approved accounts: <strong>${escapeHtml((bridge?.accounts ?? []).join(", ") || "none")}</strong></div>
          <div style="font-size:14px;color:#cbd5e1">Wallet sync mode: <strong>${escapeHtml(state.walletExposureMode)}</strong></div>
          <div style="font-size:14px;color:#cbd5e1">Synced wallet accounts: <strong>${String(state.walletExposedAccounts.length)}</strong></div>
          <div style="font-size:14px;color:#cbd5e1">EVM compatibility: <strong>${escapeHtml(EVM_COMPATIBILITY_METHODS.join(", "))}</strong></div>
          <div style="font-size:12px;color:#94a3b8;line-height:1.5">${escapeHtml(bridge?.warning ?? "The bridge is idle until a page requests approval.")}</div>
        </div>
      </section>

      <section style="display:grid;gap:16px;grid-template-columns:minmax(0,1.2fr) minmax(320px,0.8fr)">
        <div style="display:grid;gap:16px">
          <section style="border:1px solid rgba(51,65,85,1);background:rgba(15,23,42,0.88);border-radius:24px;padding:20px">
            <h2 style="margin:0 0 10px;font-size:20px">Connection proposals</h2>
            <div style="display:grid;gap:12px">${renderProposals(state)}</div>
          </section>

          <section style="border:1px solid rgba(51,65,85,1);background:rgba(15,23,42,0.88);border-radius:24px;padding:20px">
            <h2 style="margin:0 0 10px;font-size:20px">Request queue</h2>
            <div style="display:grid;gap:12px">${renderRequests(state)}</div>
          </section>

          <section style="border:1px solid rgba(51,65,85,1);background:rgba(15,23,42,0.88);border-radius:24px;padding:20px">
            <h2 style="margin:0 0 10px;font-size:20px">Connected sites</h2>
            <div style="display:grid;gap:12px">${renderSessions(state)}</div>
          </section>
        </div>

        <div style="display:grid;gap:16px">
          <section style="border:1px solid rgba(51,65,85,1);background:rgba(15,23,42,0.88);border-radius:24px;padding:20px">
            <h2 style="margin:0 0 10px;font-size:20px">Synced wallet accounts</h2>
            <div style="display:grid;gap:10px">${renderWalletProfiles(state)}</div>
          </section>

          <section style="border:1px solid rgba(51,65,85,1);background:rgba(15,23,42,0.88);border-radius:24px;padding:20px">
            <h2 style="margin:0 0 10px;font-size:20px">Permission model</h2>
            <div style="display:grid;gap:10px">
              ${DAPP_PERMISSION_DEFINITIONS.map(
                (permission) => `
                  <article style="border:1px solid rgba(51,65,85,1);border-radius:18px;padding:14px 16px;background:rgba(2,6,23,0.72)">
                    <div style="font-weight:600;color:#fff">${permission.label}</div>
                    <div style="margin-top:6px;color:#cbd5e1;font-size:14px;line-height:1.5">${permission.description}</div>
                  </article>`,
              ).join("")}
            </div>
          </section>

          <section style="border:1px solid rgba(51,65,85,1);background:rgba(15,23,42,0.88);border-radius:24px;padding:20px">
            <h2 style="margin:0 0 10px;font-size:20px">Safety constraints</h2>
            <ul style="margin:0;padding-left:18px;color:#cbd5e1;font-size:14px;line-height:1.7">
              <li>No seed or private key in webpages or content scripts</li>
              <li>No silent approvals or background signing</li>
              <li>No WalletConnect in this wave</li>
              <li>No live transaction signing output or broadcast</li>
              <li>No wallet-backed account exposure outside preview-backed bridge data</li>
            </ul>
          </section>

          <section style="border:1px solid rgba(51,65,85,1);background:rgba(15,23,42,0.88);border-radius:24px;padding:20px">
            <h2 style="margin:0 0 10px;font-size:20px">Recent decisions</h2>
            <div style="display:grid;gap:10px">${renderApprovalResults(state)}</div>
          </section>
        </div>
      </section>

      <section style="display:grid;gap:12px">
        ${EXTENSION_PHASES.map(
          (phase, index) => `
            <div style="display:flex;justify-content:space-between;gap:12px;border:1px solid rgba(51,65,85,1);border-radius:20px;padding:16px;background:rgba(15,23,42,0.88)">
              <div>
                <div style="font-size:12px;color:#94a3b8">Phase ${index + 1}</div>
                <div style="margin-top:4px;font-weight:600;color:#fff">${phase}</div>
              </div>
              <span style="align-self:flex-start;border:1px solid rgba(250,204,21,0.35);background:rgba(250,204,21,0.12);color:#fde68a;border-radius:999px;padding:4px 8px;font-size:12px">${index < 9 ? "Preview" : "Planned"}</span>
            </div>`,
        ).join("")}
      </section>
    </main>
  `;
}

function getRoot(message: string): HTMLElement {
  const element = document.getElementById("app");

  if (!element) {
    throw new Error(message);
  }

  return element;
}

function renderProposals(state: BackgroundStateSnapshot): string {
  if (state.proposals.length === 0) {
    return emptyCard("No pending connection proposals.");
  }

  return state.proposals
    .map(
      (proposal) => `
        <article style="border:1px solid rgba(51,65,85,1);border-radius:18px;padding:14px 16px;background:rgba(2,6,23,0.72);display:grid;gap:10px">
          <div style="display:flex;justify-content:space-between;gap:12px">
            <div>
              <div style="font-weight:600;color:#fff">${escapeHtml(proposal.origin.title)}</div>
              <div style="margin-top:4px;font-size:12px;color:#94a3b8">${escapeHtml(proposal.origin.origin)}</div>
            </div>
            <span style="${badgeStyle(proposal.origin.trustLevel === "trusted" ? "#10b981" : "#f59e0b")}">${proposal.origin.trustLevel}</span>
          </div>
          <div style="font-size:14px;color:#cbd5e1;line-height:1.5">Permissions: ${escapeHtml(proposal.requestedPermissions.join(", "))}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${actionButton("approve-proposal", proposal.id, "Approve preview", true)}
            ${actionButton("reject-proposal", proposal.id, "Reject", false)}
          </div>
        </article>`,
    )
    .join("");
}

function renderRequests(state: BackgroundStateSnapshot): string {
  if (state.pendingRequests.length === 0) {
    return emptyCard("No request prompts are waiting.");
  }

  return state.pendingRequests
    .map(
      (request) => `
        <article style="border:1px solid rgba(51,65,85,1);border-radius:18px;padding:14px 16px;background:rgba(2,6,23,0.72);display:grid;gap:10px">
          <div style="display:flex;justify-content:space-between;gap:12px">
            <div>
              <div style="font-weight:600;color:#fff">${escapeHtml(getDappRequestKindLabel(request.kind))}</div>
              <div style="margin-top:4px;font-size:12px;color:#94a3b8">${escapeHtml(request.origin.origin)}</div>
            </div>
            <span style="${badgeStyle("#0ea5e9")}">${request.chainId ?? "multi"}</span>
          </div>
          <div style="font-size:14px;color:#cbd5e1;line-height:1.5">${escapeHtml(request.summary)}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${actionButton("approve-request", request.id, "Approve preview", true)}
            ${actionButton("reject-request", request.id, "Reject", false)}
          </div>
        </article>`,
    )
    .join("");
}

function renderSessions(state: BackgroundStateSnapshot): string {
  if (state.sessions.length === 0) {
    return emptyCard("No connected sites stored.");
  }

  return state.sessions
    .map(
      (session) => `
        <article style="border:1px solid rgba(51,65,85,1);border-radius:18px;padding:14px 16px;background:rgba(2,6,23,0.72);display:grid;gap:10px">
          <div style="display:flex;justify-content:space-between;gap:12px">
            <div>
              <div style="font-weight:600;color:#fff">${escapeHtml(session.origin.title)}</div>
              <div style="margin-top:4px;font-size:12px;color:#94a3b8">${escapeHtml(session.origin.origin)}</div>
            </div>
            <span style="${badgeStyle(session.status === "active" ? "#10b981" : "#ef4444")}">${escapeHtml(getDappSessionStatusLabel(session.status))}</span>
          </div>
          <div style="font-size:14px;color:#cbd5e1;line-height:1.5">Permissions: ${escapeHtml(session.permissions.join(", "))}</div>
          ${
            session.status === "active"
              ? `<div>${actionButton("revoke-session", session.id, "Revoke session", false)}</div>`
              : ""
          }
        </article>`,
    )
    .join("");
}

function renderApprovalResults(state: BackgroundStateSnapshot): string {
  if (state.approvalResults.length === 0) {
    return emptyCard("No approvals or rejections recorded yet.");
  }

  return state.approvalResults
    .slice(0, 6)
    .map(
      (result) => `
        <article style="border:1px solid rgba(51,65,85,1);border-radius:18px;padding:14px 16px;background:rgba(2,6,23,0.72)">
          <div style="display:flex;justify-content:space-between;gap:12px">
            <div style="font-weight:600;color:#fff">${result.decision} ${result.targetKind}</div>
            <div style="font-size:12px;color:#94a3b8">${escapeHtml(result.targetId)}</div>
          </div>
          ${result.reason ? `<div style="margin-top:6px;font-size:13px;color:#cbd5e1;line-height:1.5">${escapeHtml(result.reason)}</div>` : ""}
        </article>`,
    )
    .join("");
}

function renderWalletProfiles(state: BackgroundStateSnapshot): string {
  if (state.walletExposedAccounts.length === 0) {
    return emptyCard("Open the Acorus web app in the same browser profile to sync local EVM wallet addresses into the extension bridge.");
  }

  return state.walletExposedAccounts
    .map(
      (profile) => `
        <article style="border:1px solid rgba(51,65,85,1);border-radius:18px;padding:14px 16px;background:rgba(2,6,23,0.72)">
          <div style="display:flex;justify-content:space-between;gap:12px">
            <div>
              <div style="font-weight:600;color:#fff">${escapeHtml(profile.name)}</div>
              <div style="margin-top:4px;font-size:12px;color:#94a3b8">${escapeHtml(profile.account)}</div>
            </div>
            <span style="${badgeStyle(profile.selected ? "#10b981" : "#0ea5e9")}">${profile.selected ? "selected" : "synced"}</span>
          </div>
        </article>`,
    )
    .join("");
}

function wireOptionActions(): void {
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
        await loadOptionsState();
      }
    });
  });
}

async function sendAction(action: string, targetId: string): Promise<void> {
  if (action === "approve-proposal") {
    await chrome.runtime.sendMessage({
      kind: "approve_proposal",
      requestId: createRequestId("options"),
      surface: "options",
      proposalId: targetId,
    });
    return;
  }

  if (action === "reject-proposal") {
    await chrome.runtime.sendMessage({
      kind: "reject_proposal",
      requestId: createRequestId("options"),
      surface: "options",
      proposalId: targetId,
    });
    return;
  }

  if (action === "approve-request") {
    await chrome.runtime.sendMessage({
      kind: "approve_request",
      requestId: createRequestId("options"),
      surface: "options",
      requestIdTarget: targetId,
    });
    return;
  }

  if (action === "reject-request") {
    await chrome.runtime.sendMessage({
      kind: "reject_request",
      requestId: createRequestId("options"),
      surface: "options",
      requestIdTarget: targetId,
    });
    return;
  }

  if (action === "revoke-session") {
    await chrome.runtime.sendMessage({
      kind: "revoke_session",
      requestId: createRequestId("options"),
      surface: "options",
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
  return `align-self:flex-start;border:1px solid ${color}55;background:${color}22;color:#e2e8f0;border-radius:999px;padding:4px 8px;font-size:12px`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

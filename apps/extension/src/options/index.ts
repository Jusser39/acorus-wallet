import {
  DAPP_PERMISSION_DEFINITIONS,
  getDappConnectionTransportLabel,
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
          This options shell now mirrors the live bridge state. Connect, accounts, chainId, switchChain, common <code>window.ethereum</code> methods, real EVM sign/send execution after signer confirmation, preview WalletConnect pairing records, and staged multichain follow-up requests can flow through the extension. Public local EVM accounts can now sync from the Acorus web app, while WalletConnect relay and non-EVM execution still remain gated.
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
          <div style="font-size:14px;color:#cbd5e1">Default exposed account: <strong>${escapeHtml(state.walletExposedAccounts.find((profile) => profile.selected)?.account ?? "none")}</strong></div>
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

          ${
            state.signerUnlockQueue.length
              ? `<section style="border:1px solid rgba(245,158,11,0.45);background:rgba(120,53,15,0.16);border-radius:24px;padding:20px">
                   <h2 style="margin:0 0 10px;font-size:20px;color:#fde68a">Signer confirmation gate</h2>
                   <p style="margin:0 0 12px;color:#fcd34d;font-size:14px;line-height:1.6">
                     Approved requests pause here until the user explicitly confirms inside the extension wallet.
                     After confirmation, the requesting dApp receives only the final signature or transaction hash for that approved request — never raw key material.
                   </p>
                   <div style="display:grid;gap:12px">${renderSignerUnlockQueue(state)}</div>
                 </section>`
              : ""
          }

          <section style="border:1px solid rgba(51,65,85,1);background:rgba(15,23,42,0.88);border-radius:24px;padding:20px">
            <h2 style="margin:0 0 10px;font-size:20px">Connected peers</h2>
            <div style="display:grid;gap:12px">${renderSessions(state)}</div>
          </section>
        </div>

        <div style="display:grid;gap:16px">
          <section style="border:1px solid rgba(51,65,85,1);background:rgba(15,23,42,0.88);border-radius:24px;padding:20px">
            <h2 style="margin:0 0 10px;font-size:20px">WalletConnect pairing shell</h2>
            <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.6">
              Paste a WalletConnect URI to queue a preview-only pairing proposal. The
              symKey is redacted immediately and never persisted in extension state.
            </p>
            ${renderWalletConnectComposer()}
          </section>

          <section style="border:1px solid rgba(51,65,85,1);background:rgba(15,23,42,0.88);border-radius:24px;padding:20px">
            <h2 style="margin:0 0 10px;font-size:20px">Session request studio</h2>
            <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.6">
              Queue preview-only follow-up requests for any connected injected site
              or WalletConnect peer, with explicit chain and account context.
            </p>
            ${renderSessionRequestComposer(state)}
          </section>

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
              <li>No raw WalletConnect pairing secret persistence</li>
              <li>No live WalletConnect relay session in this wave</li>
              <li>No real client-side sign execution behind queued session requests yet</li>
              <li>No live transaction signing output or broadcast</li>
              <li>No automatic exposure of every synced account to every site</li>
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
              <span style="align-self:flex-start;border:1px solid rgba(250,204,21,0.35);background:rgba(250,204,21,0.12);color:#fde68a;border-radius:999px;padding:4px 8px;font-size:12px">${index < EXTENSION_PHASES.length ? "Preview" : "Planned"}</span>
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
          <div style="font-size:14px;color:#cbd5e1;line-height:1.5">Transport: <strong>${escapeHtml(getDappConnectionTransportLabel(proposal.transport))}</strong></div>
          <div style="font-size:14px;color:#cbd5e1;line-height:1.5">Permissions: ${escapeHtml(proposal.requestedPermissions.join(", "))}</div>
          <div style="font-size:14px;color:#cbd5e1;line-height:1.5">Account to expose: <strong>${escapeHtml(proposal.requestedAccounts[0] ?? "none")}</strong></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${actionButton("approve-proposal", proposal.id, "Approve account", true)}
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
          <div style="font-size:14px;color:#cbd5e1;line-height:1.5">Transport: <strong>${escapeHtml(getDappConnectionTransportLabel(request.transport))}</strong></div>
          <div style="font-size:14px;color:#cbd5e1;line-height:1.5">${escapeHtml(request.summary)}</div>
          ${request.warning ? `<div style="font-size:13px;color:#fbbf24;line-height:1.6">${escapeHtml(request.warning)}</div>` : ""}
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${actionButton("approve-request", request.id, "Approve to signer gate", true)}
            ${actionButton("reject-request", request.id, "Reject", false)}
          </div>
        </article>`,
    )
    .join("");
}

function renderSignerUnlockQueue(state: BackgroundStateSnapshot): string {
  return state.signerUnlockQueue
    .map(
      (intent) => `
        <article style="border:1px solid rgba(245,158,11,0.45);border-radius:18px;padding:14px 16px;background:rgba(120,53,15,0.14);display:grid;gap:10px">
          <div style="display:flex;justify-content:space-between;gap:12px">
            <div>
              <div style="font-weight:600;color:#fff">${escapeHtml(getDappRequestKindLabel(intent.kind))}</div>
              <div style="margin-top:4px;font-size:12px;color:#fcd34d">${escapeHtml(intent.origin)}</div>
            </div>
            <span style="${badgeStyle(state.extensionVaultStatus.isUnlocked ? "#10b981" : "#f59e0b")}">${state.extensionVaultStatus.isUnlocked ? "ready" : "unlock required"}</span>
          </div>
          <div style="font-size:14px;color:#fde68a;line-height:1.5">${escapeHtml(intent.summary)}</div>
          ${intent.warning ? `<div style="font-size:13px;color:#fbbf24;line-height:1.6">${escapeHtml(intent.warning)}</div>` : ""}
          <div style="font-size:13px;color:#fcd34d">Account: <strong>${escapeHtml(intent.account ?? "none")}</strong> · Chain: <strong>${escapeHtml(String(intent.chainId ?? "multi"))}</strong></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${actionButton("confirm-signer-unlock", intent.id, "Confirm", true)}
            ${actionButton("reject-signer-unlock", intent.id, "Reject", false)}
          </div>
        </article>`,
    )
    .join("");
}

function renderSessions(state: BackgroundStateSnapshot): string {
  if (state.sessions.length === 0) {
    return emptyCard("No connected peers stored.");
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
          <div style="font-size:14px;color:#cbd5e1;line-height:1.5">Transport: <strong>${escapeHtml(getDappConnectionTransportLabel(session.transport))}</strong></div>
          <div style="font-size:14px;color:#cbd5e1;line-height:1.5">Permissions: ${escapeHtml(session.permissions.join(", "))}</div>
          <div style="font-size:14px;color:#cbd5e1;line-height:1.5">Exposed account: <strong>${escapeHtml(session.accounts[0] ?? "none")}</strong></div>
          ${renderSessionAccountActions(session.id, session.accounts[0] ?? null, state)}
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
          ${
            profile.selected
              ? `<div style="margin-top:10px;font-size:12px;color:#86efac">Default for new dApp connections</div>`
              : `<div style="margin-top:10px">${actionButton("select-wallet-profile", profile.profileId, "Use by default", true)}</div>`
          }
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
        const extra = button.dataset.extra;

        if (!action || !targetId) {
          return;
        }

        button.disabled = true;

        try {
          await sendAction(action, targetId, extra);
        } finally {
          await loadOptionsState();
        }
    });
  });

  const pairingForm = root.querySelector<HTMLFormElement>("#walletconnect-pairing-form");
  const pairButton = root.querySelector<HTMLButtonElement>("#walletconnect-pair-button");
  const uriField = root.querySelector<HTMLTextAreaElement>("#walletconnect-uri");
  const titleField = root.querySelector<HTMLInputElement>("#walletconnect-title");
  const requestForm = root.querySelector<HTMLFormElement>("#session-request-form");
  const requestButton = root.querySelector<HTMLButtonElement>("#session-request-button");
  const requestSessionField = root.querySelector<HTMLSelectElement>("#session-request-session");
  const requestChainField = root.querySelector<HTMLSelectElement>("#session-request-chain");
  const requestSummaryField = root.querySelector<HTMLInputElement>("#session-request-summary");
  const requestMeta = root.querySelector<HTMLElement>("#session-request-meta");

  pairingForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const uri = uriField?.value.trim() ?? "";
    const title = titleField?.value.trim() ?? "";

    if (!uri) {
      window.alert("Paste a WalletConnect URI first.");
      return;
    }

    if (pairButton) {
      pairButton.disabled = true;
    }

    try {
      const response = (await chrome.runtime.sendMessage({
        kind: "queue_walletconnect_pairing",
        requestId: createRequestId("options"),
        surface: "options",
        uri,
        title: title || undefined,
      })) as ExtensionRuntimeResponse;

      if (!response.ok) {
        window.alert(response.error?.message ?? "WalletConnect pairing preview failed.");
      }
    } finally {
      await loadOptionsState();
    }
  });

  const syncSessionRequestComposer = () => {
    if (!requestSessionField || !requestChainField) {
      return;
    }

    const selected = requestSessionField.selectedOptions[0];
    const chainIds = (selected?.dataset.chainIds ?? "")
      .split(",")
      .filter((value) => value.length > 0);
    const currentValue = requestChainField.value;
    requestChainField.innerHTML = chainIds
      .map((chainId) => `<option value="${escapeAttribute(chainId)}">${escapeHtml(chainId)}</option>`)
      .join("");

    if (chainIds.includes(currentValue)) {
      requestChainField.value = currentValue;
    }

    if (requestMeta) {
      requestMeta.textContent =
        `${selected?.dataset.transport ?? "Injected"} · ${selected?.dataset.account ?? "No account exposed"}`;
    }
  };

  requestSessionField?.addEventListener("change", syncSessionRequestComposer);
  syncSessionRequestComposer();

  requestForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const sessionId = requestSessionField?.value ?? "";
    const requestKind = parseSessionRequestKind(
      root.querySelector<HTMLSelectElement>("#session-request-kind")?.value ?? "",
    );
    const chainId = requestChainField?.value ?? "";
    const summary = requestSummaryField?.value.trim() ?? "";

    if (!sessionId || !requestKind) {
      window.alert("Choose a connected peer and request kind first.");
      return;
    }

    if (requestButton) {
      requestButton.disabled = true;
    }

    try {
      const response = (await chrome.runtime.sendMessage({
        kind: "queue_session_request_preview",
        requestId: createRequestId("options"),
        surface: "options",
        sessionId,
        requestKind,
        chainId: chainId ? Number(chainId) : undefined,
        summary: summary || undefined,
      })) as ExtensionRuntimeResponse;

      if (!response.ok) {
        window.alert(response.error?.message ?? "Session request preview failed.");
      }
    } finally {
      await loadOptionsState();
    }
  });
}

async function sendAction(
  action: string,
  targetId: string,
  extra?: string,
): Promise<void> {
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
    return;
  }

  if (action === "select-wallet-profile") {
    await chrome.runtime.sendMessage({
      kind: "select_wallet_profile",
      requestId: createRequestId("options"),
      surface: "options",
      profileId: targetId,
    });
    return;
  }

  if (action === "set-session-account" && extra) {
    await chrome.runtime.sendMessage({
      kind: "set_session_account",
      requestId: createRequestId("options"),
      surface: "options",
      sessionId: targetId,
      profileId: extra,
    });
    return;
  }

  if (action === "confirm-signer-unlock") {
    await chrome.runtime.sendMessage({
      kind: "confirm_signer_unlock",
      requestId: createRequestId("options"),
      surface: "options",
      intentId: targetId,
    });
    return;
  }

  if (action === "reject-signer-unlock") {
    await chrome.runtime.sendMessage({
      kind: "reject_signer_unlock",
      requestId: createRequestId("options"),
      surface: "options",
      intentId: targetId,
    });
  }
}

function actionButton(
  action: string,
  id: string,
  label: string,
  primary: boolean,
  extra?: string,
): string {
  return `<button data-action="${action}" data-id="${id}"${extra ? ` data-extra="${extra}"` : ""} style="border:1px solid ${primary ? "rgba(56,189,248,0.35)" : "rgba(71,85,105,0.7)"};background:${primary ? "rgba(14,165,233,0.12)" : "rgba(2,6,23,0.75)"};color:${primary ? "#bae6fd" : "#e2e8f0"};border-radius:999px;padding:8px 12px;font-size:12px;cursor:pointer">${label}</button>`;
}

function renderWalletConnectComposer(): string {
  return `
    <form id="walletconnect-pairing-form" style="margin-top:14px;display:grid;gap:10px">
      <label style="display:grid;gap:6px">
        <span style="font-size:12px;color:#94a3b8">Peer label</span>
        <input id="walletconnect-title" placeholder="Universal Swap" style="border:1px solid rgba(71,85,105,0.8);background:rgba(2,6,23,0.72);color:#fff;border-radius:16px;padding:12px 14px;font-size:14px" />
      </label>
      <label style="display:grid;gap:6px">
        <span style="font-size:12px;color:#94a3b8">WalletConnect URI</span>
        <textarea id="walletconnect-uri" rows="3" placeholder="wc:topic@2?relay-protocol=irn&symKey=..." style="border:1px solid rgba(71,85,105,0.8);background:rgba(2,6,23,0.72);color:#fff;border-radius:16px;padding:12px 14px;font-size:14px;resize:vertical"></textarea>
      </label>
      <div style="font-size:12px;color:#94a3b8;line-height:1.6">
        Acorus stores only redacted peer metadata in the preview queue. Live WalletConnect relay and WalletConnect-side execution remain disabled.
      </div>
      <div>
        <button id="walletconnect-pair-button" type="submit" style="border:1px solid rgba(56,189,248,0.35);background:rgba(14,165,233,0.12);color:#bae6fd;border-radius:999px;padding:10px 14px;font-size:12px;cursor:pointer">
          Queue pairing preview
        </button>
      </div>
    </form>`;
}

function renderSessionRequestComposer(state: BackgroundStateSnapshot): string {
  const activeSessions = state.sessions.filter((session) => session.status === "active");

  if (activeSessions.length === 0) {
    return emptyCard("Approve a site or WalletConnect peer first to queue preview requests.");
  }

  const firstSession = activeSessions[0];
  if (!firstSession) {
    return emptyCard("Approve a site or WalletConnect peer first to queue preview requests.");
  }

  const chainOptions = firstSession.chainIds
    .map((chainId) => `<option value="${chainId}">${chainId}</option>`)
    .join("");

  return `
    <form id="session-request-form" style="margin-top:14px;display:grid;gap:10px">
      <label style="display:grid;gap:6px">
        <span style="font-size:12px;color:#94a3b8">Connected peer</span>
        <select id="session-request-session" style="border:1px solid rgba(71,85,105,0.8);background:rgba(2,6,23,0.72);color:#fff;border-radius:16px;padding:12px 14px;font-size:14px">
          ${activeSessions
            .map((session) => `
              <option
                value="${escapeAttribute(session.id)}"
                data-chain-ids="${escapeAttribute(session.chainIds.join(","))}"
                data-account="${escapeAttribute(session.accounts[0] ?? "")}"
                data-transport="${escapeAttribute(getDappConnectionTransportLabel(session.transport))}"
              >
                ${escapeHtml(session.origin.title)} · ${escapeHtml(getDappConnectionTransportLabel(session.transport))}
              </option>`)
            .join("")}
        </select>
      </label>
      <div id="session-request-meta" style="font-size:12px;color:#94a3b8;line-height:1.6">
        ${escapeHtml(getDappConnectionTransportLabel(firstSession.transport))} · ${escapeHtml(firstSession.accounts[0] ?? "No account exposed")}
      </div>
      <div style="display:grid;gap:10px;grid-template-columns:repeat(2,minmax(0,1fr))">
        <label style="display:grid;gap:6px">
          <span style="font-size:12px;color:#94a3b8">Request kind</span>
          <select id="session-request-kind" style="border:1px solid rgba(71,85,105,0.8);background:rgba(2,6,23,0.72);color:#fff;border-radius:16px;padding:12px 14px;font-size:14px">
            <option value="sign_message">Sign message</option>
            <option value="sign_typed_data">Sign typed data</option>
            <option value="sign_transaction">Sign transaction</option>
            <option value="send_transaction">Send transaction</option>
          </select>
        </label>
        <label style="display:grid;gap:6px">
          <span style="font-size:12px;color:#94a3b8">Chain</span>
          <select id="session-request-chain" style="border:1px solid rgba(71,85,105,0.8);background:rgba(2,6,23,0.72);color:#fff;border-radius:16px;padding:12px 14px;font-size:14px">
            ${chainOptions}
          </select>
        </label>
      </div>
      <label style="display:grid;gap:6px">
        <span style="font-size:12px;color:#94a3b8">Summary override</span>
        <input id="session-request-summary" placeholder="Leave blank to auto-generate a preview summary" style="border:1px solid rgba(71,85,105,0.8);background:rgba(2,6,23,0.72);color:#fff;border-radius:16px;padding:12px 14px;font-size:14px" />
      </label>
      <div style="font-size:12px;color:#94a3b8;line-height:1.6">
        Requests target the selected peer's currently exposed account and chosen chain, then land in the same preview approval queue used by injected dApps.
      </div>
      <div>
        <button id="session-request-button" type="submit" style="border:1px solid rgba(56,189,248,0.35);background:rgba(14,165,233,0.12);color:#bae6fd;border-radius:999px;padding:10px 14px;font-size:12px;cursor:pointer">
          Queue request preview
        </button>
      </div>
    </form>`;
}

function renderSessionAccountActions(
  sessionId: string,
  currentAccount: string | null,
  state: BackgroundStateSnapshot,
): string {
  const alternatives = state.walletExposedAccounts.filter(
    (profile) => profile.account !== currentAccount,
  );

  if (alternatives.length === 0) {
    return "";
  }

  return `
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${alternatives
        .map((profile) =>
          actionButton(
            "set-session-account",
            sessionId,
            `Use ${escapeHtml(profile.name)}`,
            false,
            profile.profileId,
          ))
        .join("")}
    </div>`;
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

function escapeAttribute(value: string): string {
  return escapeHtml(value)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseSessionRequestKind(value: string):
  | "sign_message"
  | "sign_typed_data"
  | "sign_transaction"
  | "send_transaction"
  | null {
  switch (value) {
    case "sign_message":
    case "sign_typed_data":
    case "sign_transaction":
    case "send_transaction":
      return value;
    default:
      return null;
  }
}

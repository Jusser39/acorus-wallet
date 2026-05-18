import { getDappConnectionTransportLabel, getDappRequestKindLabel } from "@acorus/shared";
import { EVM_COMPATIBILITY_METHODS } from "../shared/evm-compat";
import {
  createRequestId,
  createSkeletonState,
  type BackgroundStateSnapshot,
  type ExtensionRuntimeResponse,
} from "../shared/protocol";

const root = getRoot("Popup root not found.");
let lastCreatedMnemonic: string | null = null;

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
  const vault = state.extensionVaultStatus;
  const selectedProfile =
    vault.profiles.find((profile) => profile.selected)
    ?? state.walletExposedAccounts.find((profile) => profile.selected)
    ?? vault.profiles[0]
    ?? state.walletExposedAccounts[0]
    ?? null;
  const activeChain = selectedProfile?.chainIds[0] ?? state.activeOriginBridge?.activeChainId ?? 1;
  const pendingCount =
    state.proposals.length + state.pendingRequests.length + state.signerUnlockQueue.length;

  return `
    <main class="wallet-shell">
      <header class="wallet-header">
        <div class="brand">
          <div class="brand-mark">A</div>
          <div>
            <div class="brand-title">Acorus</div>
            <div class="brand-subtitle">${escapeHtml(selectedProfile?.name ?? "Multichain wallet")}</div>
          </div>
        </div>
        <div class="row">
          <span class="network-pill">${chainName(activeChain)}</span>
          <button class="icon-button" type="button" data-open-url="options.html" title="Settings">⚙</button>
        </div>
      </header>

      <div class="main">
        ${pendingCount > 0 ? renderPromptNotice(state) : ""}
        ${lastCreatedMnemonic ? renderSeedReveal(lastCreatedMnemonic) : ""}
        ${vault.hasVault ? renderWalletHome(state, selectedProfile) : renderOnboarding()}
        ${renderConnectedSites(state)}
        ${renderRecentActivity(state)}
      </div>
    </main>
  `;
}

function renderWalletHome(
  state: BackgroundStateSnapshot,
  selectedProfile: BackgroundStateSnapshot["walletExposedAccounts"][number] | null,
): string {
  const vault = state.extensionVaultStatus;
  const account = selectedProfile?.account ?? "No synced account";
  const unlockedLabel = vault.isUnlocked ? "Unlocked" : "Locked";

  return `
    <section class="account-card">
      <div class="account-row">
        <div>
          <div class="account-name">${escapeHtml(selectedProfile?.name ?? "Main wallet")}</div>
          <div class="address-pill">${shortAddress(account)} <span>⌘</span></div>
        </div>
        <span class="badge ${vault.isUnlocked ? "green" : ""}">${unlockedLabel}</span>
      </div>

      <div class="balance">$0.00</div>
      <div class="balance-sub">${state.walletExposureMode === "wallet_backed" ? "Wallet-backed provider active" : "Preview bridge mode"}</div>

      <div class="quick-actions">
        ${quickAction("↗", "Send", "/send")}
        ${quickAction("⇄", "Swap", "/swap")}
        ${quickAction("+", "Buy", "/receive")}
        ${quickAction("⌂", "dApps", "/dapps")}
      </div>
    </section>

    <section class="panel stack">
      <div class="tabs">
        <span class="tab" data-active="true">Tokens</span>
        <span class="tab">NFTs</span>
        <span class="tab">Activity</span>
      </div>
      <div class="token-list">
        ${renderTokenRows(state, selectedProfile)}
      </div>
      <div class="row">
        ${
          vault.isUnlocked
            ? `<button class="ghost-button" type="button" data-action="lock-extension-wallet" data-id="vault">Lock wallet</button>`
            : `<form id="unlock-wallet-form" class="form" style="flex:1">
                <input class="field" name="passcode" placeholder="Passcode" type="password" autocomplete="current-password">
                <button class="primary-button" type="submit">Unlock</button>
              </form>`
        }
        <button class="ghost-button" type="button" data-open-url="http://85.239.59.199:8080/extension">Open site</button>
      </div>
    </section>
  `;
}

function renderOnboarding(): string {
  return `
    <section class="onboarding-card stack">
      <div>
        <h1 style="margin:0;font-size:24px;letter-spacing:-0.03em">Create your wallet</h1>
        <p class="copy" style="margin-top:8px">
          Seed phrase and encrypted vault stay inside this Chrome extension.
          Sites connect through the injected provider, like a normal wallet.
        </p>
      </div>
      <form id="create-wallet-form" class="form">
        <input class="field" name="name" placeholder="Wallet name" value="Main wallet">
        <input class="field" name="passcode" placeholder="Passcode, min 8 chars" type="password" autocomplete="new-password">
        <button class="primary-button" type="submit">Create wallet</button>
      </form>
      <details>
        <summary style="cursor:pointer;font-weight:700">Import existing seed phrase</summary>
        <form id="import-wallet-form" class="form" style="margin-top:12px">
          <input class="field" name="name" placeholder="Wallet name" value="Imported wallet">
          <textarea class="field" name="mnemonic" placeholder="Seed phrase" rows="3"></textarea>
          <input class="field" name="passcode" placeholder="Passcode, min 8 chars" type="password" autocomplete="new-password">
          <button class="ghost-button" type="submit">Import wallet</button>
        </form>
      </details>
    </section>
  `;
}

function renderPromptNotice(state: BackgroundStateSnapshot): string {
  const signer = state.signerUnlockQueue[0];
  if (signer) {
    return `
      <section class="notice warning">
        <strong>${escapeHtml(getDappRequestKindLabel(signer.kind))}</strong><br>
        ${escapeHtml(signer.summary)}
        <div class="row" style="margin-top:10px">
          ${actionButton("confirm-signer-unlock", signer.id, "Confirm", true)}
          ${actionButton("reject-signer-unlock", signer.id, "Reject", false, true)}
        </div>
      </section>
    `;
  }

  const request = state.pendingRequests[0];
  if (request) {
    return `
      <section class="notice warning">
        <strong>${escapeHtml(getDappRequestKindLabel(request.kind))} request</strong><br>
        ${escapeHtml(request.origin.title)} wants approval on ${chainName(request.chainId)}.
        <div class="row" style="margin-top:10px">
          ${actionButton("approve-request", request.id, "Review", true)}
          ${actionButton("reject-request", request.id, "Reject", false, true)}
        </div>
      </section>
    `;
  }

  const proposal = state.proposals[0];
  if (!proposal) {
    return "";
  }

  return `
    <section class="notice warning">
      <strong>Connect request</strong><br>
      ${escapeHtml(proposal.origin.title)} wants to see your selected account.
      <div class="row" style="margin-top:10px">
        ${actionButton("approve-proposal", proposal.id, "Connect", true)}
        ${actionButton("reject-proposal", proposal.id, "Reject", false, true)}
      </div>
    </section>
  `;
}

function renderSeedReveal(mnemonic: string): string {
  return `
    <section class="notice warning">
      <strong>Save these words offline now.</strong>
      <div class="seed-grid" style="margin-top:10px">
        ${mnemonic
          .split(" ")
          .map((word, index) => `<div class="seed-word"><span class="muted">${index + 1}.</span> ${escapeHtml(word)}</div>`)
          .join("")}
      </div>
      <button class="ghost-button" data-action="clear-created-seed" data-id="seed" style="margin-top:10px" type="button">I saved it</button>
    </section>
  `;
}

function renderTokenRows(
  state: BackgroundStateSnapshot,
  selectedProfile: BackgroundStateSnapshot["walletExposedAccounts"][number] | null,
): string {
  const rows = [
    {
      symbol: selectedProfile?.chainFamily.toUpperCase() ?? "ETH",
      name: selectedProfile?.name ?? "Ethereum",
      meta: selectedProfile ? shortAddress(selectedProfile.account) : "Ready",
      value: "0.00",
      accent: "#627EEA",
    },
    { symbol: "BNB", name: "BNB Smart Chain", meta: "EVM", value: "0.00", accent: "#F3BA2F" },
    { symbol: "POL", name: "Polygon", meta: "EVM", value: "0.00", accent: "#8247E5" },
    { symbol: "SOL", name: "Solana", meta: "Preview", value: "0.00", accent: "#14F195" },
    { symbol: "TRX", name: "Tron", meta: "Preview", value: "0.00", accent: "#EF0027" },
  ];

  const synced = state.walletExposedAccounts
    .filter((profile) => profile.account !== selectedProfile?.account)
    .slice(0, 2)
    .map((profile) => ({
      symbol: profile.chainFamily.toUpperCase(),
      name: profile.name,
      meta: shortAddress(profile.account),
      value: "Synced",
      accent: "#38bdf8",
    }));

  return [...rows, ...synced]
    .map((token) => `
      <div class="token-row">
        <div class="token-icon" style="background:linear-gradient(135deg,${token.accent},#8b5cf6)">${escapeHtml(token.symbol.slice(0, 3))}</div>
        <div>
          <div class="token-name">${escapeHtml(token.name)}</div>
          <div class="token-meta">${escapeHtml(token.meta)}</div>
        </div>
        <div class="token-value">${escapeHtml(token.value)}</div>
      </div>
    `)
    .join("");
}

function renderConnectedSites(state: BackgroundStateSnapshot): string {
  const activeSessions = state.sessions.filter((session) => session.status === "active");
  if (!activeSessions.length && !state.proposals.length) {
    return `
      <section class="panel">
        <h2 class="section-title">Connected sites</h2>
        <p class="copy">No dApps connected yet. Open Acorus or another dApp and connect through the extension.</p>
      </section>
    `;
  }

  return `
    <section class="panel stack">
      <h2 class="section-title">Connected sites</h2>
      ${activeSessions
        .slice(0, 3)
        .map((session) => `
          <div class="site-row">
            <div>
              <div class="token-name">${escapeHtml(session.origin.title)}</div>
              <div class="token-meta">${escapeHtml(getDappConnectionTransportLabel(session.transport))} · ${escapeHtml(String(session.activeChainId ?? "multi"))}</div>
            </div>
            ${actionButton("revoke-session", session.id, "Disconnect", false, true)}
          </div>
        `)
        .join("")}
    </section>
  `;
}

function renderRecentActivity(state: BackgroundStateSnapshot): string {
  const latest = state.approvalResults[0];
  const activeBridge = state.activeOriginBridge;
  return `
    <section class="panel stack">
      <h2 class="section-title">Activity</h2>
      <div class="row">
        <span class="small">Provider</span>
        <span class="badge">${escapeHtml(state.providerInjection.replace("_", " "))}</span>
      </div>
      <div class="row">
        <span class="small">EVM methods</span>
        <span class="small">${EVM_COMPATIBILITY_METHODS.length} compatible</span>
      </div>
      <div class="row">
        <span class="small">Active site</span>
        <span class="small">${escapeHtml(activeBridge?.origin ?? "none")}</span>
      </div>
      <p class="copy">${latest ? `${latest.decision} ${latest.targetKind}` : "No approvals yet."}</p>
    </section>
  `;
}

function wirePopupActions(): void {
  wireWalletForms();
  const buttons = root.querySelectorAll<HTMLButtonElement>("[data-action], [data-open-url]");

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const openUrl = button.dataset.openUrl;
      if (openUrl) {
        await chrome.tabs.create({ url: openUrl.startsWith("http") ? openUrl : chrome.runtime.getURL(openUrl) });
        return;
      }

      const action = button.dataset.action;
      const targetId = button.dataset.id;
      const extra = button.dataset.extra;

      if (action === "clear-created-seed") {
        lastCreatedMnemonic = null;
        await loadPopupState();
        return;
      }

      if (action === "lock-extension-wallet") {
        await chrome.runtime.sendMessage({
          kind: "lock_extension_wallet",
          requestId: createRequestId("popup"),
          surface: "popup",
        });
        await loadPopupState();
        return;
      }

      if (!action || !targetId) {
        return;
      }

      button.disabled = true;

      try {
        await sendAction(action, targetId, extra);
      } finally {
        await loadPopupState();
      }
    });
  });
}

function wireWalletForms(): void {
  root
    .querySelector<HTMLFormElement>("#unlock-wallet-form")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget as HTMLFormElement);
      const response = (await chrome.runtime.sendMessage({
        kind: "unlock_extension_wallet",
        requestId: createRequestId("popup"),
        surface: "popup",
        passcode: String(formData.get("passcode") ?? ""),
      })) as ExtensionRuntimeResponse;

      if (!response.ok) {
        window.alert(response.error?.message ?? "Unable to unlock wallet.");
      }

      await loadPopupState();
    });

  root
    .querySelector<HTMLFormElement>("#create-wallet-form")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget as HTMLFormElement);
      const response = (await chrome.runtime.sendMessage({
        kind: "create_extension_wallet",
        requestId: createRequestId("popup"),
        surface: "popup",
        name: String(formData.get("name") ?? "Main wallet"),
        passcode: String(formData.get("passcode") ?? ""),
      })) as ExtensionRuntimeResponse;

      if (response.ok && response.result) {
        const result = response.result as { mnemonic?: string };
        lastCreatedMnemonic = result.mnemonic ?? null;
      } else {
        lastCreatedMnemonic = null;
        window.alert(response.error?.message ?? "Unable to create wallet.");
      }

      await loadPopupState();
    });

  root
    .querySelector<HTMLFormElement>("#import-wallet-form")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget as HTMLFormElement);
      const response = (await chrome.runtime.sendMessage({
        kind: "import_extension_wallet",
        requestId: createRequestId("popup"),
        surface: "popup",
        name: String(formData.get("name") ?? "Imported wallet"),
        mnemonic: String(formData.get("mnemonic") ?? ""),
        passcode: String(formData.get("passcode") ?? ""),
      })) as ExtensionRuntimeResponse;

      if (!response.ok) {
        window.alert(response.error?.message ?? "Unable to import wallet.");
      }

      await loadPopupState();
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
    return;
  }

  if (action === "select-wallet-profile") {
    await chrome.runtime.sendMessage({
      kind: "select_wallet_profile",
      requestId: createRequestId("popup"),
      surface: "popup",
      profileId: targetId,
    });
    return;
  }

  if (action === "set-session-account" && extra) {
    await chrome.runtime.sendMessage({
      kind: "set_session_account",
      requestId: createRequestId("popup"),
      surface: "popup",
      sessionId: targetId,
      profileId: extra,
    });
    return;
  }

  if (action === "confirm-signer-unlock") {
    await chrome.runtime.sendMessage({
      kind: "confirm_signer_unlock",
      requestId: createRequestId("popup"),
      surface: "popup",
      intentId: targetId,
    });
    return;
  }

  if (action === "reject-signer-unlock") {
    await chrome.runtime.sendMessage({
      kind: "reject_signer_unlock",
      requestId: createRequestId("popup"),
      surface: "popup",
      intentId: targetId,
    });
  }
}

function quickAction(icon: string, label: string, path: string): string {
  return `
    <button class="quick-action" type="button" data-open-url="http://85.239.59.199:8080${path}">
      <span>${icon}</span>
      <span>${escapeHtml(label)}</span>
    </button>
  `;
}

function actionButton(
  action: string,
  id: string,
  label: string,
  primary: boolean,
  danger = false,
): string {
  const className = danger ? "danger-button" : primary ? "primary-button" : "ghost-button";
  return `<button data-action="${action}" data-id="${escapeHtml(id)}" class="${className}" type="button">${escapeHtml(label)}</button>`;
}

function chainName(chainId: string | number | null | undefined): string {
  switch (Number(chainId)) {
    case 1:
      return "Ethereum";
    case 56:
      return "BNB Chain";
    case 137:
      return "Polygon";
    case 8453:
      return "Base";
    case 42161:
      return "Arbitrum";
    case 101:
      return "Solana";
    default:
      return chainId ? `Chain ${chainId}` : "Multichain";
  }
}

function shortAddress(value: string): string {
  if (!value || value === "No synced account") {
    return value;
  }

  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getRoot(message: string): HTMLElement {
  const element = document.getElementById("app");

  if (!element) {
    throw new Error(message);
  }

  return element;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

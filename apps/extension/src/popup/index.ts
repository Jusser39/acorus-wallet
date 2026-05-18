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
let currentPopupState: BackgroundStateSnapshot = createSkeletonState();
let currentHomeSnapshot: ExtensionPortfolioSnapshot | null = null;

type ExtensionPortfolioSnapshot = {
  updatedAt: string;
  totalFiatValue: number | null;
  activeChainId: string | number;
  networks: Array<{
    id: string;
    family: string;
    chainId: string | number;
    name: string;
    nativeSymbol: string;
    iconSymbol: string;
    accent: string;
    capabilities: {
      receive: boolean;
      balance: boolean;
      send: boolean;
      swap: boolean;
      dapp: boolean;
    };
  }>;
  assets: Array<{
    family: string;
    chainId: string | number;
    type: string;
    symbol: string;
    name: string;
    decimals: number;
    tokenAddress?: string | null;
    balanceRaw: string;
    balanceFormatted: string;
    fiatValue?: number | null;
    priceUsd?: number | null;
    source?: string | null;
  }>;
  warnings: string[];
};

void loadPopupState();

async function loadPopupState(): Promise<void> {
  let state = createSkeletonState();
  let home: ExtensionPortfolioSnapshot | null = null;

  try {
    const [stateResponse, homeResponse] = await Promise.all([
      chrome.runtime.sendMessage({
        kind: "get_state",
        requestId: createRequestId("popup"),
        surface: "popup",
        origin: null,
      }) as Promise<ExtensionRuntimeResponse>,
      loadExtensionHome(),
    ]);

    if (stateResponse.ok && stateResponse.result) {
      state = stateResponse.result as BackgroundStateSnapshot;
    }
    home = homeResponse;
  } catch {
    state = createSkeletonState();
    home = null;
  }

  currentPopupState = state;
  currentHomeSnapshot = home;
  root.innerHTML = renderPopup(state, home);
  wirePopupActions();
}

async function loadExtensionHome(): Promise<ExtensionPortfolioSnapshot | null> {
  try {
    const response = (await chrome.runtime.sendMessage({
      kind: "get_extension_home",
      requestId: createRequestId("popup_home"),
      surface: "popup",
    })) as ExtensionRuntimeResponse;

    return response.ok && response.result
      ? response.result as ExtensionPortfolioSnapshot
      : null;
  } catch {
    return null;
  }
}

function renderPopup(
  state: BackgroundStateSnapshot,
  home: ExtensionPortfolioSnapshot | null,
): string {
  const vault = state.extensionVaultStatus;
  const selectedProfile =
    vault.profiles.find((profile) => profile.selected)
    ?? state.walletExposedAccounts.find((profile) => profile.selected)
    ?? vault.profiles[0]
    ?? state.walletExposedAccounts[0]
    ?? null;
  const activeChain = home?.activeChainId ?? selectedProfile?.chainIds[0] ?? state.activeOriginBridge?.activeChainId ?? 1;
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
        ${vault.hasVault ? renderWalletHome(state, selectedProfile, home) : renderOnboarding()}
        ${renderConnectedSites(state)}
        ${renderRecentActivity(state)}
      </div>
    </main>
  `;
}

function renderWalletHome(
  state: BackgroundStateSnapshot,
  selectedProfile: BackgroundStateSnapshot["walletExposedAccounts"][number] | null,
  home: ExtensionPortfolioSnapshot | null,
): string {
  const vault = state.extensionVaultStatus;
  const account = selectedProfile?.account ?? "No synced account";
  const unlockedLabel = vault.isUnlocked ? "Unlocked" : "Locked";
  const activeNetwork = home?.networks.find(
    (item) => String(item.chainId) === String(home.activeChainId),
  ) ?? home?.networks[0] ?? null;
  const visibleAssets = home?.assets
    .filter((asset) =>
      !activeNetwork
      || String(asset.chainId) === String(activeNetwork.chainId),
    )
    .slice(0, 30) ?? [];

  return `
    <section class="account-card">
      <div class="account-row">
        <div>
          <button class="account-name as-button" type="button" data-open-url="options.html">
            ${escapeHtml(selectedProfile?.name ?? "Main wallet")} ▾
          </button>
          <button class="address-pill as-button" type="button" data-copy="${escapeHtml(account)}">
            ${shortAddress(account)} <span>⧉</span>
          </button>
        </div>
        <button class="network-pill as-button" type="button" data-action="open-network-panel" data-id="network">
          ${escapeHtml(activeNetwork?.name ?? "All networks")} ▾
        </button>
      </div>

      <div class="balance">${formatFiat(home?.totalFiatValue)}</div>
      <div class="balance-sub">${unlockedLabel} · ${state.walletExposureMode === "wallet_backed" ? "Multichain vault active" : "Preview bridge mode"}</div>

      <div class="quick-actions">
        ${quickAction("＋", "Buy", "internal:buy")}
        ${quickAction("⇄", "Swap", "internal:swap")}
        ${quickAction("↗", "Send", "internal:send")}
        ${quickAction("↙", "Receive", "internal:receive")}
      </div>
    </section>

    ${renderNetworkPanel(home)}
    ${renderExtensionActionPanel(state, home)}

    <section class="panel stack">
      <div class="tabs">
        <span class="tab" data-active="true">Tokens</span>
        <span class="tab">Activity</span>
        <span class="tab">dApps</span>
        <span class="tab">NFT</span>
      </div>
      <div class="row">
        <span class="network-pill">All popular networks</span>
        <span class="small">${home?.assets.length ?? 0} assets</span>
      </div>
      <div class="token-list">
        ${
          visibleAssets.length
            ? visibleAssets.map(renderAssetRow).join("")
            : `<p class="copy">No live assets yet. Add a token or switch network.</p>`
        }
      </div>
      ${home?.warnings.length ? renderWarnings(home.warnings) : ""}
      <div class="row">
        ${
          vault.isUnlocked
            ? `<button class="ghost-button" type="button" data-action="lock-extension-wallet" data-id="vault">Lock wallet</button>`
            : `<form id="unlock-wallet-form" class="form" style="flex:1">
                <input class="field" name="passcode" placeholder="Passcode" type="password" autocomplete="current-password">
                <button class="primary-button" type="submit">Unlock</button>
              </form>`
        }
        <button class="ghost-button" type="button" data-open-url="http://24wallet.ru/extension">Open site</button>
      </div>
    </section>
  `;
}

function renderAssetRow(asset: ExtensionPortfolioSnapshot["assets"][number]): string {
  const assetId = [
    asset.family,
    String(asset.chainId),
    asset.type,
    asset.tokenAddress?.toLowerCase() ?? "native",
    asset.symbol.toUpperCase(),
  ].join(":");

  return `
    <button class="token-row as-button wide" type="button" data-asset-id="${escapeHtml(assetId)}">
      <div class="token-icon">${escapeHtml(asset.symbol.slice(0, 4))}</div>
      <div>
        <div class="token-name">${escapeHtml(asset.name)}</div>
        <div class="token-meta">
          ${escapeHtml(asset.balanceFormatted ?? "0")} ${escapeHtml(asset.symbol)}
          · ${escapeHtml(asset.source ?? "unknown")}
        </div>
      </div>
      <div class="token-value">${formatFiat(asset.fiatValue)}</div>
    </button>
  `;
}

function renderNetworkPanel(home: ExtensionPortfolioSnapshot | null): string {
  if (!home) {
    return "";
  }

  return `
    <section class="panel stack" id="network-panel" hidden>
      <div class="row">
        <h2 class="section-title">Networks</h2>
        <input class="field compact" id="network-search" placeholder="Search">
      </div>
      <div class="network-grid">
        ${home.networks.map((network) => `
          <button class="network-card ${String(network.chainId) === String(home.activeChainId) ? "active" : ""}"
                  type="button"
                  data-action="set-active-chain"
                  data-id="${escapeHtml(String(network.chainId))}">
            <span class="network-dot" style="background:${escapeHtml(network.accent)}"></span>
            <span>
              <strong>${escapeHtml(network.name)}</strong>
              <small>${escapeHtml(network.family.toUpperCase())} · ${network.capabilities.send ? "send" : "receive only"}</small>
            </span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderExtensionActionPanel(
  state: BackgroundStateSnapshot,
  home: ExtensionPortfolioSnapshot | null,
): string {
  return `
    <section class="panel stack" id="action-panel" hidden>
      <div class="row">
        <h2 class="section-title" id="action-title">Action</h2>
        <button class="icon-button" type="button" data-action="close-action-panel" data-id="action">×</button>
      </div>
      <div id="action-content">
        ${renderReceiveComposer(state, home)}
      </div>
    </section>
  `;
}

function renderReceiveComposer(
  state: BackgroundStateSnapshot,
  home: ExtensionPortfolioSnapshot | null,
): string {
  const vault = state.extensionVaultStatus;
  const profiles = vault.profiles.length ? vault.profiles : state.walletExposedAccounts;
  const networks = home?.networks ?? [];

  return `
    <div class="form">
      <label class="small">Network</label>
      <select class="field" id="receive-network">
        ${networks.map((network) => `
          <option value="${escapeHtml(String(network.chainId))}">
            ${escapeHtml(network.name)}
          </option>
        `).join("")}
      </select>
      <div class="receive-box">
        ${profiles.map((profile) => `
          <div class="site-row">
            <div>
              <div class="token-name">${escapeHtml(profile.name)}</div>
              <div class="token-meta">${escapeHtml(profile.chainFamily)} · ${shortAddress(profile.account)}</div>
            </div>
            <button class="ghost-button" type="button" data-copy="${escapeHtml(profile.account)}">Copy</button>
          </div>
        `).join("")}
      </div>
      <p class="copy">Send only assets from the selected network to the matching address family. Wrong network can permanently lose funds.</p>
    </div>
  `;
}

function renderWarnings(warnings: string[]): string {
  return `
    <section class="notice warning">
      <strong>Network notes</strong>
      <ul>
        ${warnings.slice(0, 4).map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}
      </ul>
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
  const buttons = root.querySelectorAll<HTMLButtonElement>("[data-action], [data-open-url], [data-copy]");

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const copyValue = button.dataset.copy;
      if (copyValue) {
        await navigator.clipboard.writeText(copyValue);
        return;
      }

      const openUrl = button.dataset.openUrl;
      if (openUrl) {
        await chrome.tabs.create({ url: openUrl.startsWith("http") ? openUrl : chrome.runtime.getURL(openUrl) });
        return;
      }

      const action = button.dataset.action;
      const targetId = button.dataset.id;
      const extra = button.dataset.extra;

      if (action === "open-network-panel") {
        root.querySelector<HTMLElement>("#network-panel")?.toggleAttribute("hidden");
        return;
      }

      if (action === "set-active-chain" && targetId) {
        await chrome.runtime.sendMessage({
          kind: "set_active_extension_chain",
          requestId: createRequestId("popup"),
          surface: "popup",
          chainId: /^\d+$/u.test(targetId) ? Number(targetId) : targetId,
        });
        await loadPopupState();
        return;
      }

      if (action === "open-action-panel" && targetId) {
        const panel = root.querySelector<HTMLElement>("#action-panel");
        const title = root.querySelector<HTMLElement>("#action-title");
        const content = root.querySelector<HTMLElement>("#action-content");

        if (panel && title && content) {
          panel.hidden = false;
          title.textContent = `${targetId[0]?.toUpperCase() ?? ""}${targetId.slice(1)}`;
          content.innerHTML = renderActionContent(targetId);
          wireInlineButtons(content);
        }
        return;
      }

      if (action === "close-action-panel") {
        const panel = root.querySelector<HTMLElement>("#action-panel");
        if (panel) {
          panel.hidden = true;
        }
        return;
      }

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

function wireInlineButtons(scope: HTMLElement): void {
  scope.querySelectorAll<HTMLButtonElement>("[data-open-url], [data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const copyValue = button.dataset.copy;
      if (copyValue) {
        await navigator.clipboard.writeText(copyValue);
        return;
      }

      const openUrl = button.dataset.openUrl;
      if (openUrl) {
        await chrome.tabs.create({ url: openUrl.startsWith("http") ? openUrl : chrome.runtime.getURL(openUrl) });
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

function quickAction(icon: string, label: string, target: string): string {
  if (target.startsWith("internal:")) {
    return `
      <button class="quick-action" type="button" data-action="open-action-panel" data-id="${escapeHtml(target.replace("internal:", ""))}">
        <span>${icon}</span>
        <span>${escapeHtml(label)}</span>
      </button>
    `;
  }

  return `
    <button class="quick-action" type="button" data-open-url="http://24wallet.ru${target}">
      <span>${icon}</span>
      <span>${escapeHtml(label)}</span>
    </button>
  `;
}

function renderActionContent(target: string): string {
  switch (target) {
    case "buy":
      return `
        <div class="form">
          <p class="copy">Buy crypto through approved external on-ramp providers. Acorus does not custody fiat or sell crypto.</p>
          <button class="primary-button" type="button" data-open-url="http://24wallet.ru/buy">Open Buy</button>
        </div>
      `;
    case "swap":
      return `
        <div class="form">
          <p class="copy">Swap quotes route through the Acorus swap shell. Execution is enabled only where the adapter is safety-reviewed.</p>
          <button class="primary-button" type="button" data-open-url="http://24wallet.ru/swap">Open Swap</button>
        </div>
      `;
    case "send":
      return `
        <div class="form">
          <input class="field" placeholder="Recipient address">
          <input class="field" placeholder="Amount">
          <p class="copy">EVM send can execute after review. Non-EVM send remains disabled until adapter execution is reviewed.</p>
          <button class="primary-button" type="button" data-open-url="http://24wallet.ru/send">Review Send</button>
        </div>
      `;
    case "receive":
    default:
      return renderReceiveComposer(currentPopupState, currentHomeSnapshot);
  }
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

function formatFiat(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(2)} $`
    : "—";
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

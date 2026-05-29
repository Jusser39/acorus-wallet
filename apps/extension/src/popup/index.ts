import {
  getDappConnectionTransportLabel,
  getDappRequestKindLabel,
  shortenFormattedEvmTokenAmount,
  type EvmSwapQuoteResponse,
} from "@acorus/shared";
import {
  createRequestId,
  createSkeletonState,
  type BackgroundStateSnapshot,
  type ExtensionRuntimeResponse,
} from "../shared/protocol";

const root = getRoot("Popup root not found.");
const EXTENSION_SWAP_API_BASES = ["https://24wallet.ru", "http://85.239.59.199:8080"] as const;
const EXTENSION_POPUP_SETTINGS_KEY = "acorus_extension_popup_settings";
const POPUP_HOME_TIMEOUT_MS = 2500;
const POPUP_CURRENCIES = ["USD", "EUR", "RUB", "GBP", "JPY", "CNY", "KRW", "TRY"] as const;
const POPUP_LANGUAGES = [
  "English",
  "Русский",
  "Deutsch",
  "Español",
  "Français",
  "中文",
  "日本語",
  "한국어",
] as const;
const FALLBACK_NETWORKS: ExtensionPortfolioSnapshot["networks"] = [
  {
    id: "1",
    family: "evm",
    chainId: 1,
    name: "Ethereum",
    nativeSymbol: "ETH",
    iconSymbol: "ETH",
    accent: "#627EEA",
    capabilities: { receive: true, balance: true, send: true, swap: true, dapp: true },
  },
  {
    id: "56",
    family: "evm",
    chainId: 56,
    name: "BNB Smart Chain",
    nativeSymbol: "BNB",
    iconSymbol: "BNB",
    accent: "#F3BA2F",
    capabilities: { receive: true, balance: true, send: true, swap: true, dapp: true },
  },
  {
    id: "137",
    family: "evm",
    chainId: 137,
    name: "Polygon",
    nativeSymbol: "POL",
    iconSymbol: "POL",
    accent: "#8247E5",
    capabilities: { receive: true, balance: true, send: true, swap: true, dapp: true },
  },
  {
    id: "8453",
    family: "evm",
    chainId: 8453,
    name: "Base",
    nativeSymbol: "ETH",
    iconSymbol: "BASE",
    accent: "#0052FF",
    capabilities: { receive: true, balance: true, send: true, swap: true, dapp: true },
  },
  {
    id: "101",
    family: "solana",
    chainId: 101,
    name: "Solana",
    nativeSymbol: "SOL",
    iconSymbol: "SOL",
    accent: "#14F195",
    capabilities: { receive: true, balance: true, send: true, swap: true, dapp: true },
  },
  {
    id: "tron-mainnet",
    family: "tron",
    chainId: "tron-mainnet",
    name: "Tron",
    nativeSymbol: "TRX",
    iconSymbol: "TRX",
    accent: "#EF0027",
    capabilities: { receive: true, balance: true, send: true, swap: true, dapp: true },
  },
  {
    id: "bitcoin-mainnet",
    family: "utxo",
    chainId: "bitcoin-mainnet",
    name: "Bitcoin",
    nativeSymbol: "BTC",
    iconSymbol: "BTC",
    accent: "#F7931A",
    capabilities: { receive: true, balance: true, send: true, swap: true, dapp: true },
  },
  {
    id: "ton-mainnet",
    family: "ton",
    chainId: "ton-mainnet",
    name: "TON",
    nativeSymbol: "TON",
    iconSymbol: "TON",
    accent: "#0098EA",
    capabilities: { receive: true, balance: true, send: true, swap: true, dapp: true },
  },
];
let lastCreatedMnemonic: string | null = null;
let onboardingTab: "create" | "import" = "create";
let currentPopupState: BackgroundStateSnapshot = createSkeletonState();
let currentHomeSnapshot: ExtensionPortfolioSnapshot | null = null;
let popupFeedback: { message: string; tone: "error" | "success" | "warning" } | null = null;
let currentPopupSettings: ExtensionPopupSettings = {
  theme: "auto",
  currency: "USD",
  language: "English",
};

type ExtensionPopupSettings = {
  theme: "auto" | "light" | "dark";
  currency: string;
  language: string;
};

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
    logoUrl?: string | null;
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
    const [stateResponse, homeResponse, settingsResponse] = await Promise.all([
      chrome.runtime.sendMessage({
        kind: "get_state",
        requestId: createRequestId("popup"),
        surface: "popup",
        origin: null,
      }) as Promise<ExtensionRuntimeResponse>,
      withTimeout(loadExtensionHome(), POPUP_HOME_TIMEOUT_MS, null),
      loadPopupSettings(),
    ]);

    if (stateResponse.ok && stateResponse.result) {
      state = stateResponse.result as BackgroundStateSnapshot;
    }
    home = homeResponse;
    currentPopupSettings = settingsResponse;
  } catch {
    state = createSkeletonState();
    home = null;
  }

  currentPopupState = state;
  currentHomeSnapshot = home;
  applyPopupTheme(currentPopupSettings.theme);
  root.innerHTML = renderPopup(state, home);
  wirePopupActions();
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(fallback);
    }, timeoutMs);

    promise
      .then((value) => {
        if (settled) {
          return;
        }

        settled = true;
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        if (settled) {
          return;
        }

        settled = true;
        window.clearTimeout(timer);
        resolve(fallback);
      });
  });
}

async function loadPopupSettings(): Promise<ExtensionPopupSettings> {
  try {
    const result = await chrome.storage.local.get(EXTENSION_POPUP_SETTINGS_KEY);
    return normalizePopupSettings(result[EXTENSION_POPUP_SETTINGS_KEY]);
  } catch {
    return normalizePopupSettings(null);
  }
}

function normalizePopupSettings(value: unknown): ExtensionPopupSettings {
  if (typeof value !== "object" || value === null) {
    return { theme: "auto", currency: "USD", language: "English" };
  }

  const candidate = value as Partial<ExtensionPopupSettings>;
  return {
    theme: candidate.theme === "light" || candidate.theme === "dark" || candidate.theme === "auto"
      ? candidate.theme
      : "auto",
    currency: typeof candidate.currency === "string" && candidate.currency.trim()
      ? candidate.currency.trim().slice(0, 8)
      : "USD",
    language: typeof candidate.language === "string" && candidate.language.trim()
      ? candidate.language.trim().slice(0, 32)
      : "English",
  };
}

function applyPopupTheme(theme: ExtensionPopupSettings["theme"]): void {
  document.documentElement.dataset.acorusTheme = theme;
}

function renderPopupFeedback(): string {
  if (!popupFeedback) {
    return "";
  }

  return `
    <section id="popup-feedback" class="notice ${escapeHtml(popupFeedback.tone)}">
      ${escapeHtml(popupFeedback.message)}
    </section>
  `;
}

function setPopupFeedback(
  message: string,
  tone: "error" | "success" | "warning" = "error",
): void {
  popupFeedback = { message, tone };
  const feedback = root.querySelector<HTMLElement>("#popup-feedback");

  if (feedback) {
    feedback.outerHTML = renderPopupFeedback();
    return;
  }

  root.querySelector<HTMLElement>(".main")?.insertAdjacentHTML("afterbegin", renderPopupFeedback());
}

function clearPopupFeedback(): void {
  popupFeedback = null;
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
    state.walletExposedAccounts.find((profile) => profile.selected)
    ?? vault.profiles.find((profile) => profile.selected)
    ?? vault.profiles[0]
    ?? state.walletExposedAccounts[0]
    ?? null;
  const activeChain = home?.activeChainId ?? selectedProfile?.chainIds[0] ?? state.activeOriginBridge?.activeChainId ?? 1;
  const activeNetwork = home?.networks.find((network) => String(network.chainId) === String(activeChain));
  const pendingCount =
    state.proposals.length + state.pendingRequests.length + state.signerUnlockQueue.length;
  const statusLabel = !vault.hasVault
    ? "Setup"
    : vault.isUnlocked
      ? "Unlocked"
      : "Locked";
  const statusClass = !vault.hasVault
    ? "setup"
    : vault.isUnlocked
      ? "ok"
      : "locked";
  const statusAction = !vault.hasVault
    ? "set-onboarding-tab"
    : vault.isUnlocked
      ? "lock-extension-wallet"
      : "focus-unlock-wallet";
  const statusId = !vault.hasVault ? onboardingTab : "vault";

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
          <button class="network-pill as-button" type="button" data-action="open-network-panel" data-id="network">
            ${escapeHtml(String(activeChain) === "all" ? "All networks" : activeNetwork?.name ?? chainName(activeChain))} ▾
          </button>
          <button class="status-pill as-button ${statusClass}"
                  type="button"
                  data-action="${statusAction}"
                  data-id="${escapeHtml(statusId)}">
            ${statusLabel}
          </button>
          <button class="icon-button" type="button" data-action="open-action-panel" data-id="settings" title="Settings">⚙</button>
        </div>
      </header>

      <div class="main">
        ${pendingCount > 0 ? renderPromptNotice(state) : ""}
        ${renderPopupFeedback()}
        ${lastCreatedMnemonic ? renderSeedReveal(lastCreatedMnemonic) : ""}
        ${!vault.hasVault ? `${renderNetworkPanel(home)}${renderExtensionActionPanel(state, home)}` : ""}
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
      || String(home?.activeChainId) === "all"
      || String(asset.chainId) === String(activeNetwork.chainId),
    )
    .slice(0, 30) ?? [];

  return `
    <section class="account-card">
      <div class="account-row">
        <div>
          <button class="account-name as-button" type="button" data-action="open-account-panel" data-id="account">
            ${escapeHtml(selectedProfile?.name ?? "Main wallet")} ▾
          </button>
          <button class="address-pill as-button" type="button" data-copy="${escapeHtml(account)}">
            ${shortAddress(account)} <span>⧉</span>
          </button>
        </div>
        <button class="network-pill as-button" type="button" data-action="open-network-panel" data-id="network">
          ${escapeHtml(String(home?.activeChainId) === "all" ? "All networks" : activeNetwork?.name ?? "All networks")} ▾
        </button>
      </div>

      <div class="balance">${formatFiat(home?.totalFiatValue)}</div>
      <div class="balance-sub">${unlockedLabel} · ${state.walletExposureMode === "wallet_backed" ? "Multichain vault active" : "Preview bridge mode"}</div>

      <div class="hero-actions">
        <button class="hero-action" type="button" data-action="open-action-panel" data-id="send">
          <span>↗</span>
          <strong>Send</strong>
        </button>
        <button class="hero-action" type="button" data-action="open-action-panel" data-id="receive">
          <span>↙</span>
          <strong>Receive</strong>
        </button>
      </div>
      <button class="portfolio-button" type="button" data-open-url="https://24wallet.ru/wallet">
        View portfolio <span>→</span>
      </button>
      <div class="mini-actions">
        ${quickAction("＋", "Buy", "internal:buy")}
        ${quickAction("⇄", "Swap", "internal:swap")}
      </div>
    </section>

    ${renderAccountPanel(state, selectedProfile)}
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
                <button class="danger-button" type="button" data-action="reset-extension-wallet" data-id="extension-vault">
                  Reset local wallet
                </button>
              </form>`
        }
        <button class="ghost-button" type="button" data-open-url="https://24wallet.ru/extension">Open site</button>
      </div>
    </section>
  `;
}

function renderAccountPanel(
  state: BackgroundStateSnapshot,
  selectedProfile: BackgroundStateSnapshot["walletExposedAccounts"][number] | null,
): string {
  const profiles = state.extensionVaultStatus.profiles.length
    ? state.extensionVaultStatus.profiles
    : state.walletExposedAccounts;
  const familyLabels = [
    { family: "evm", label: "EVM Account" },
    { family: "solana", label: "Solana Account" },
    { family: "tron", label: "Tron Account" },
  ];

  return `
    <section class="panel stack" id="account-panel" hidden>
      <div class="row">
        <h2 class="section-title">Accounts</h2>
        <span class="small">${state.extensionVaultStatus.isUnlocked ? "unlocked" : "locked"}</span>
      </div>
      ${familyLabels.map(({ family, label }) => {
        const profile = profiles.find((item) => item.chainFamily === family);
        if (!profile) {
          return renderComingSoonAccount(label);
        }

        return `
          <button class="account-option ${profile.profileId === selectedProfile?.profileId ? "active" : ""}"
                  type="button"
                  data-action="select-wallet-profile"
                  data-id="${escapeHtml(profile.profileId)}">
            <span>
              <strong>${escapeHtml(label)}</strong>
              <small>${escapeHtml(profile.name)} · ${shortAddress(profile.account)}</small>
            </span>
            <span class="badge">${escapeHtml(profile.chainFamily.toUpperCase())}</span>
          </button>
        `;
      }).join("")}
      ${renderComingSoonAccount("BTC Coming soon")}
      ${renderComingSoonAccount("TON Coming soon")}
    </section>
  `;
}

function renderComingSoonAccount(label: string): string {
  return `
    <div class="account-option disabled">
      <span>
        <strong>${escapeHtml(label)}</strong>
        <small>Profile derivation is not enabled yet</small>
      </span>
      <span class="badge muted-badge">Soon</span>
    </div>
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
  const icon = asset.logoUrl
    ? `<img src="${escapeHtml(asset.logoUrl)}" alt="" loading="lazy">`
    : escapeHtml(asset.symbol.slice(0, 4).toUpperCase());
  const balanceText = `${asset.balanceFormatted ?? "0"} ${asset.symbol}`;
  const chainLabel = asset.family === "evm"
    ? `Chain ${String(asset.chainId)}`
    : asset.family.toUpperCase();

  return `
    <button class="token-row as-button wide" type="button" data-asset-id="${escapeHtml(assetId)}">
      <div class="token-icon">${icon}</div>
      <div>
        <div class="token-name">${escapeHtml(asset.name)}</div>
        <div class="token-meta">${escapeHtml(chainLabel)} · ${escapeHtml(balanceText)}</div>
      </div>
      <div class="token-value">${formatFiat(asset.fiatValue)}</div>
    </button>
  `;
}

function renderNetworkPanel(home: ExtensionPortfolioSnapshot | null): string {
  const networks = home?.networks.length ? home.networks : FALLBACK_NETWORKS;
  const activeChainId = home?.activeChainId ?? "all";

  return `
    <section class="panel stack" id="network-panel" hidden>
      <div class="row">
        <h2 class="section-title">Networks</h2>
        <input class="field compact" id="network-search" placeholder="Search">
      </div>
      <div class="network-grid">
        ${renderNetworkCard({
          id: "all",
          family: "all",
          chainId: "all",
          name: "All networks",
          nativeSymbol: "ALL",
          iconSymbol: "ALL",
          accent: "#111827",
          capabilities: { receive: true, balance: true, send: false, swap: false, dapp: false },
        } as any, activeChainId)}
        ${networks.map((network) => renderNetworkCard(network, activeChainId)).join("")}
      </div>
    </section>
  `;
}

function renderNetworkGroup(
  label: string,
  networks: Array<ExtensionPortfolioSnapshot["networks"][number] & { family: string }>,
  activeChainId: string | number,
): string {
  // Deprecated, using flat list
  return networks.map((network) => renderNetworkCard(network, activeChainId)).join("");
}

function renderNetworkCard(
  network: ExtensionPortfolioSnapshot["networks"][number] & { family: string },
  activeChainId: string | number,
): string {
  const chainId = String(network.chainId);

  return `
    <button class="network-card ${chainId === String(activeChainId) ? "active" : ""}"
            type="button"
            data-action="set-active-chain"
            data-id="${escapeHtml(chainId)}"
            data-network-name="${escapeHtml(`${network.name} ${network.nativeSymbol} ${network.family}`.toLowerCase())}">
      <span class="network-dot" style="background:${escapeHtml(network.accent)}"></span>
      <span>
        <strong>${escapeHtml(network.name)}</strong>
        <small>${escapeHtml(network.family.toUpperCase())}</small>
      </span>
    </button>
  `;
}

function getNetworksForGroup(
  networks: ExtensionPortfolioSnapshot["networks"],
  group: string,
): ExtensionPortfolioSnapshot["networks"] {
  return networks.filter((network) => network.family === group);
}

function getNetworkGroupLabel(group: string): string {
  switch (group) {
    case "evm":
      return "EVM";
    case "solana":
      return "Solana";
    case "tron":
      return "Tron";
    case "utxo":
      return "Bitcoin";
    case "ton":
      return "TON";
    default:
      return "Other";
  }
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
  const networks = home?.networks.length ? home.networks : FALLBACK_NETWORKS;
  const selectedNetwork = networks.find((network) =>
    String(network.chainId) === String(home?.activeChainId),
  ) ?? networks[0] ?? null;
  const selectedFamily = selectedNetwork?.family ?? "evm";

  return `
    <div class="form">
      <label class="small">Network</label>
      <select class="field" id="receive-network">
        ${networks.map((network) => `
          <option value="${escapeHtml(String(network.chainId))}" data-family="${escapeHtml(network.family)}" ${String(network.chainId) === String(selectedNetwork?.chainId) ? "selected" : ""}>
            ${escapeHtml(network.name)}
          </option>
        `).join("")}
      </select>
      <div class="receive-box">
        ${renderReceiveAddressRows(profiles, selectedFamily)}
      </div>
      <p class="copy" id="receive-warning">${escapeHtml(buildReceiveWarning(selectedNetwork))}</p>
    </div>
  `;
}

function renderReceiveAddressRows(
  profiles: BackgroundStateSnapshot["walletExposedAccounts"],
  family: string,
): string {
  if (family === "utxo" || family === "ton") {
    return `
      <div class="site-row" data-receive-family="${escapeHtml(family)}">
        <div>
          <div class="token-name">${family.toUpperCase()} receive</div>
          <div class="token-meta">Coming soon</div>
        </div>
      </div>
    `;
  }

  const matching = profiles.filter((profile) => profile.chainFamily === family);

  if (!matching.length) {
    return `
      <div class="site-row" data-receive-family="${escapeHtml(family)}">
        <div>
          <div class="token-name">${escapeHtml(family.toUpperCase())} address</div>
          <div class="token-meta">Coming soon</div>
        </div>
      </div>
    `;
  }

  return matching.map((profile) => `
    <div style="display:flex; flex-direction:column; align-items:center; gap:16px; padding: 16px 0;">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(profile.account)}" alt="QR Code" style="width:200px; height:200px; border-radius:12px; background:white; padding:8px;" />
      <div class="site-row" data-receive-family="${escapeHtml(profile.chainFamily)}" style="width:100%">
        <div>
          <div class="token-name">${escapeHtml(profile.name)}</div>
          <div class="token-meta">${escapeHtml(profile.chainFamily)} · ${shortAddress(profile.account)}</div>
        </div>
        <button class="ghost-button" type="button" data-copy="${escapeHtml(profile.account)}">Copy</button>
      </div>
    </div>
  `).join("");
}

function buildReceiveWarning(network: ExtensionPortfolioSnapshot["networks"][number] | null): string {
  if (!network) {
    return "Select a network before copying a receive address.";
  }

  if (network.family === "utxo" || network.family === "ton") {
    return `${network.name} receive is coming soon in this extension build. Do not send funds here yet.`;
  }

  return `Send only ${network.name} assets to this ${network.family.toUpperCase()} address family. Wrong network can permanently lose funds.`;
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

function renderExtensionPasscodeFields(_formId: string): string {
  return `
    <section class="passcode-setup-card">
      <div class="row">
        <div>
          <strong>Choose your password</strong>
          <p class="copy" style="margin-top:4px">Use any password you want. Acorus never creates one automatically and cannot recover it.</p>
        </div>
      </div>
      <div class="form">
        <input class="field" name="passcode" placeholder="Password, min 8 chars" type="password" autocomplete="new-password">
        <input class="field" name="confirmPasscode" placeholder="Repeat password" type="password" autocomplete="new-password">
        <p class="copy compact-copy">Acorus never creates a password automatically. This password is only used to encrypt and unlock this extension vault.</p>
      </div>
    </section>
  `;
}

function renderOnboarding(): string {
  const activeIsCreate = onboardingTab === "create";

  return `
    <section class="onboarding-card stack">
      <div>
        <h1 style="margin:0;font-size:24px;letter-spacing:-0.03em">
          ${activeIsCreate ? "Create your Wallet" : "Import your Wallet"}
        </h1>
        <p class="copy" style="margin-top:8px">
          Your seed phrase and encrypted vault stay inside this Chrome extension. Set your own password, then create or import.
        </p>
      </div>
      <div class="onboarding-tabs" role="tablist" aria-label="Wallet setup">
        <button class="onboarding-tab" type="button" data-active="${activeIsCreate}" data-action="set-onboarding-tab" data-id="create">
          Create your Wallet
        </button>
        <button class="onboarding-tab" type="button" data-active="${!activeIsCreate}" data-action="set-onboarding-tab" data-id="import">
          Import your Wallet
        </button>
      </div>
      <div class="extension-quick-actions" aria-label="Quick wallet actions">
        <button class="setup-action" type="button" data-action="open-action-panel" data-id="send">
          <span>↗</span>
          <strong>Send</strong>
        </button>
        <button class="setup-action" type="button" data-action="open-action-panel" data-id="receive">
          <span>↙</span>
          <strong>Receive</strong>
        </button>
      </div>
      ${
        activeIsCreate
          ? `<form id="create-wallet-form" class="form">
              <input class="field" name="name" placeholder="Wallet name" value="Main wallet">
              ${renderExtensionPasscodeFields("create-wallet-form")}
              <button class="primary-button" type="submit">Create wallet</button>
            </form>`
          : `<form id="import-wallet-form" class="form">
          <input class="field" name="name" placeholder="Wallet name" value="Imported wallet">
          <textarea class="field" name="mnemonic" placeholder="Seed phrase" rows="3"></textarea>
          ${renderExtensionPasscodeFields("import-wallet-form")}
          <button class="primary-button" type="submit">Import wallet</button>
        </form>`
      }
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
    const approveLabel =
      request.kind === "add_chain" || request.kind === "watch_asset"
        ? "Confirm"
        : "Review";

    return `
      <section class="notice warning">
        <strong>${escapeHtml(getDappRequestKindLabel(request.kind))} request</strong><br>
        ${escapeHtml(request.origin.title)} wants approval on ${chainName(request.chainId)}.<br>
        ${renderApprovalDetailCard(request)}
        <div class="row" style="margin-top:10px">
          ${actionButton("approve-request", request.id, approveLabel, true)}
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

function renderApprovalDetailCard(
  request: BackgroundStateSnapshot["pendingRequests"][number],
): string {
  const details = request.reviewDetails;

  if (details?.kind === "add_chain") {
    return `
      <div class="approval-card">
        <div class="row"><strong>Add Network</strong>${renderRiskLabels(details.riskLabels)}</div>
        <dl>
          <div><dt>Name</dt><dd>${escapeHtml(details.chainName || "Unknown network")}</dd></div>
          <div><dt>Chain ID</dt><dd>${escapeHtml(String(details.chainIdDecimal ?? "n/a"))} / ${escapeHtml(details.chainIdHex || "n/a")}</dd></div>
          <div><dt>RPC</dt><dd>${escapeHtml(details.rpcHostname)}</dd></div>
          <div><dt>Explorer</dt><dd>${escapeHtml(details.explorerHostname)}</dd></div>
          <div><dt>Symbol</dt><dd>${escapeHtml(details.nativeSymbol || "n/a")}</dd></div>
        </dl>
      </div>
    `;
  }

  if (details?.kind === "watch_asset") {
    return `
      <div class="approval-card">
        <div class="row"><strong>Watch Asset</strong>${renderRiskLabels(details.riskLabels)}</div>
        <dl>
          <div><dt>Symbol</dt><dd>${escapeHtml(details.symbol || "UNKNOWN")}</dd></div>
          <div><dt>Address</dt><dd>${escapeHtml(shortAddress(details.tokenAddress))}</dd></div>
          <div><dt>Decimals</dt><dd>${escapeHtml(String(details.decimals ?? "n/a"))}</dd></div>
          <div><dt>Chain</dt><dd>${escapeHtml(String(details.chainId ?? "n/a"))}</dd></div>
        </dl>
      </div>
    `;
  }

  if (details?.kind === "multichain_send") {
    const ataWarning = details.ataWarning
      ? `<div><dt>ATA</dt><dd>${escapeHtml(details.ataWarning)}</dd></div>`
      : "";
    const tokenAddress = details.tokenAddress
      ? `<div><dt>Mint</dt><dd>${escapeHtml(shortAddress(details.tokenAddress))}</dd></div>`
      : "";
    const fee = details.estimatedFeeFormatted
      ? `<div><dt>Estimated fee</dt><dd>${escapeHtml(details.estimatedFeeFormatted)} SOL</dd></div>`
      : "";

    return `
      <div class="approval-card">
        <div class="row"><strong>Send ${escapeHtml(details.assetSymbol)}</strong>${renderRiskLabels(details.riskLabels)}</div>
        <dl>
          <div><dt>Network</dt><dd>${escapeHtml(details.family.toUpperCase())} · ${escapeHtml(String(details.chainId ?? "n/a"))}</dd></div>
          <div><dt>Asset</dt><dd>${escapeHtml(details.assetType ?? "native")} · ${escapeHtml(details.assetSymbol)}</dd></div>
          ${tokenAddress}
          <div><dt>From</dt><dd>${escapeHtml(shortAddress(details.fromAddress))}</dd></div>
          <div><dt>To</dt><dd>${escapeHtml(shortAddress(details.toAddress))}</dd></div>
          <div><dt>Amount</dt><dd>${escapeHtml(details.amountFormatted)} ${escapeHtml(details.assetSymbol)}</dd></div>
          ${fee}
          ${ataWarning}
        </dl>
      </div>
    `;
  }

  if (details?.kind === "token_approval") {
    return `
      <div class="approval-card">
        <div class="row"><strong>Approve ${escapeHtml(details.tokenSymbol)}</strong>${renderRiskLabels(details.riskLabels)}</div>
        <dl>
          <div><dt>Network</dt><dd>${escapeHtml(String(details.chainId ?? "n/a"))}</dd></div>
          <div><dt>Token</dt><dd>${escapeHtml(shortAddress(details.tokenAddress))}</dd></div>
          <div><dt>Spender</dt><dd>${escapeHtml(shortAddress(details.spender))}</dd></div>
          <div><dt>Amount</dt><dd>${escapeHtml(details.approvalMode === "infinite" ? "Unlimited" : (details.amountFormatted ?? details.amountRaw))}</dd></div>
          ${details.currentAllowanceFormatted ? `<div><dt>Current allowance</dt><dd>${escapeHtml(details.currentAllowanceFormatted)}</dd></div>` : ""}
          ${details.requiredAllowanceFormatted ? `<div><dt>Required allowance</dt><dd>${escapeHtml(details.requiredAllowanceFormatted)}</dd></div>` : ""}
          <div><dt>Mode</dt><dd>${escapeHtml(details.approvalMode)}</dd></div>
        </dl>
      </div>
    `;
  }

  if (details?.kind === "evm_swap") {
    return `
      <div class="approval-card">
        <div class="row"><strong>0x Swap</strong>${renderRiskLabels(details.riskLabels)}</div>
        <dl>
          <div><dt>Network</dt><dd>${escapeHtml(String(details.chainId ?? "n/a"))}</dd></div>
          <div><dt>Sell</dt><dd>${escapeHtml(details.sellAmountFormatted ?? details.sellAmountRaw)} ${escapeHtml(details.sellTokenSymbol)}</dd></div>
          <div><dt>Buy</dt><dd>${escapeHtml(details.buyAmountFormatted ?? details.buyAmountRaw)} ${escapeHtml(details.buyTokenSymbol)}</dd></div>
          <div><dt>Min received</dt><dd>${escapeHtml(details.minBuyAmountFormatted ?? details.minBuyAmountRaw ?? "n/a")}</dd></div>
          <div><dt>Route</dt><dd>${escapeHtml(details.routeLabel)}</dd></div>
          <div><dt>Contract</dt><dd>${escapeHtml(shortAddress(details.contractAddress))}</dd></div>
          <div><dt>Value</dt><dd>${escapeHtml(details.value)}</dd></div>
          ${details.expiresAt ? `<div><dt>Expires</dt><dd>${escapeHtml(new Date(details.expiresAt).toLocaleTimeString())}</dd></div>` : ""}
        </dl>
      </div>
    `;
  }

  if (details?.kind === "universal_swap") {
    return `
      <div class="approval-card">
        <div class="row"><strong>${escapeHtml(details.provider)} Swap Route</strong>${renderRiskLabels(details.riskLabels)}</div>
        <dl>
          <div><dt>Network</dt><dd>${escapeHtml(String(details.chainId ?? "multi"))}</dd></div>
          <div><dt>Sell</dt><dd>${escapeHtml(details.sellAmountFormatted ?? details.sellAmountRaw)} ${escapeHtml(details.fromLabel)}</dd></div>
          <div><dt>Buy</dt><dd>${escapeHtml(details.buyAmountFormatted ?? details.buyAmountRaw ?? "route estimate")} ${escapeHtml(details.toLabel)}</dd></div>
          <div><dt>Route</dt><dd>${escapeHtml(details.routeLabel)}</dd></div>
          <div><dt>Execution</dt><dd>${escapeHtml(details.executionStatus === "review_only" ? "Review only" : "Disabled")}</dd></div>
          ${details.slippageBps !== null && details.slippageBps !== undefined ? `<div><dt>Slippage</dt><dd>${escapeHtml(String(details.slippageBps / 100))}%</dd></div>` : ""}
          ${details.expiresAt ? `<div><dt>Expires</dt><dd>${escapeHtml(new Date(details.expiresAt).toLocaleTimeString())}</dd></div>` : ""}
        </dl>
      </div>
    `;
  }

  return `<span>${escapeHtml(request.summary)}</span>`;
}

function renderRiskLabels(labels: string[]): string {
  return `<span class="risk-labels">${labels.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}</span>`;
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
  const latest = state.activityLog.slice(0, 4);
  return `
    <section class="panel stack">
      <h2 class="section-title">Recent activity</h2>
      ${latest.length
        ? latest.map((item) => `
          <div class="site-row">
            <div>
              <div class="token-name">${escapeHtml(item.kind.replace(/_/gu, " "))}</div>
              <div class="token-meta">${escapeHtml((item.amountFormatted ?? `${item.sellTokenSymbol ?? item.tokenSymbol ?? ""}${item.buyAmountFormatted ? ` -> ${item.buyAmountFormatted} ${item.buyTokenSymbol ?? ""}` : ""}`.trim()) || item.account)}</div>
            </div>
            <span class="badge">${escapeHtml(item.status)}</span>
          </div>
        `).join("")
        : `<p class="copy">No recent wallet activity yet.</p>`}
      <button class="portfolio-button compact-portfolio" type="button" data-action="open-action-panel" data-id="activity">
        View all activity <span>→</span>
      </button>
    </section>
  `;
}

function openActionPanel(targetId: string): void {
  const panel = root.querySelector<HTMLElement>("#action-panel");
  const title = root.querySelector<HTMLElement>("#action-title");
  const content = root.querySelector<HTMLElement>("#action-content");

  if (!panel || !title || !content) {
    return;
  }

  panel.hidden = false;
  title.textContent = `${targetId[0]?.toUpperCase() ?? ""}${targetId.slice(1)}`;
  content.innerHTML = renderActionContent(targetId);
  wireInlineButtons(content);
  wireReceiveNetworkSelector(content);
  wireSendForm(content);
  wireEvmSwapForm(content);
  wireExtensionSettingsForm(content);
}

function wirePopupActions(): void {
  wireWalletForms();
  wireReceiveNetworkSelector();
  wireNetworkSearch();
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

      if (action === "open-account-panel") {
        root.querySelector<HTMLElement>("#account-panel")?.toggleAttribute("hidden");
        return;
      }

      if (action === "set-onboarding-tab" && (targetId === "create" || targetId === "import")) {
        onboardingTab = targetId;
        clearPopupFeedback();
        root.innerHTML = renderPopup(currentPopupState, currentHomeSnapshot);
        wirePopupActions();
        return;
      }

      if (action === "focus-unlock-wallet") {
        const passcodeInput = root.querySelector<HTMLInputElement>('#unlock-wallet-form input[name="passcode"]');
        if (passcodeInput) {
          passcodeInput.focus();
          passcodeInput.scrollIntoView({ block: "center" });
          return;
        }

        onboardingTab = "import";
        root.innerHTML = renderPopup(currentPopupState, currentHomeSnapshot);
        wirePopupActions();
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
        openActionPanel(targetId);
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

      if (action === "reset-extension-wallet") {
        if (button.dataset.confirmed !== "true") {
          button.dataset.confirmed = "true";
          button.textContent = "Click again to reset";
          setPopupFeedback(
            "Reset removes only this browser profile's encrypted extension vault. Your assets remain on-chain, but you need your seed phrase to restore access.",
            "warning",
          );
          window.setTimeout(() => {
            button.dataset.confirmed = "false";
            button.textContent = "Reset local extension wallet";
          }, 6000);
          return;
        }

        await chrome.runtime.sendMessage({
          kind: "reset_extension_wallet",
          requestId: createRequestId("popup"),
          surface: "popup",
        });
        lastCreatedMnemonic = null;
        clearPopupFeedback();
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

function wireNetworkSearch(scope: ParentNode = root): void {
  scope
    .querySelector<HTMLInputElement>("#network-search")
    ?.addEventListener("input", (event) => {
      const query = (event.currentTarget as HTMLInputElement).value.trim().toLowerCase();
      filterNetworkCards(scope, query);
    });
}

function wireExtensionSettingsForm(scope: ParentNode = root): void {
  const form = scope.querySelector<HTMLFormElement>("#extension-settings-form");
  if (!form) {
    return;
  }

  form
    .querySelectorAll<HTMLInputElement>('input[name="theme"]')
    .forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) {
          return;
        }

        const nextTheme = normalizePopupSettings({
          ...currentPopupSettings,
          theme: input.value,
        }).theme;
        applyPopupTheme(nextTheme);

        form.querySelectorAll<HTMLElement>(".theme-segment label").forEach((label) => {
          const radio = label.querySelector<HTMLInputElement>('input[name="theme"]');
          label.dataset.active = String(radio?.checked ?? false);
        });
      });
    });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const next = normalizePopupSettings({
      theme: String(formData.get("theme") ?? currentPopupSettings.theme),
      currency: String(formData.get("currency") ?? currentPopupSettings.currency),
      language: String(formData.get("language") ?? currentPopupSettings.language),
    });

    await chrome.storage.local.set({ [EXTENSION_POPUP_SETTINGS_KEY]: next });
    currentPopupSettings = next;
    applyPopupTheme(next.theme);

    const status = form.querySelector<HTMLElement>("#extension-settings-status");
    if (status) {
      status.textContent = "Settings saved.";
    }
  });
}

function filterNetworkCards(scope: ParentNode, query: string): void {
  scope.querySelectorAll<HTMLElement>(".network-card").forEach((card) => {
    const label = card.dataset.networkName ?? card.textContent?.toLowerCase() ?? "";
    card.hidden = Boolean(query) && !label.includes(query);
  });
}

function wireReceiveNetworkSelector(scope: ParentNode = root): void {
  scope
    .querySelector<HTMLSelectElement>("#receive-network")
    ?.addEventListener("change", (event) => {
      const select = event.currentTarget as HTMLSelectElement;
      const selected = select.selectedOptions[0];
      const family = selected?.dataset.family ?? "evm";
      const networks = currentHomeSnapshot?.networks ?? [];
      const network = networks.find((item) => String(item.chainId) === select.value) ?? null;
      const profiles = currentPopupState.extensionVaultStatus.profiles.length
        ? currentPopupState.extensionVaultStatus.profiles
        : currentPopupState.walletExposedAccounts;
      const box = scope.querySelector<HTMLElement>(".receive-box");
      const warning = scope.querySelector<HTMLElement>("#receive-warning");

      if (box) {
        box.innerHTML = renderReceiveAddressRows(profiles, family);
        wireInlineButtons(box);
      }

      if (warning) {
        warning.textContent = buildReceiveWarning(network);
      }
    });
}

function wireSendForm(scope: ParentNode = root): void {
  const form = scope.querySelector<HTMLFormElement>("#solana-send-form");

  if (!form) {
    return;
  }

  const networkSelect = form.querySelector<HTMLSelectElement>("#send-network");
  const note = form.querySelector<HTMLElement>("#send-support-note");
  const button = form.querySelector<HTMLButtonElement>("button[type='submit']");
  const updateSupport = () => {
    const family = networkSelect?.selectedOptions[0]?.dataset.family ?? "";
    const supported = family === "solana";

    if (note) {
      note.textContent = supported
        ? "Solana send is live after explicit popup confirmation."
        : "Send execution for this network is coming soon.";
    }

    if (button) {
      button.disabled = !supported;
    }
  };

  networkSelect?.addEventListener("change", updateSupport);
  updateSupport();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const assetSelect = form.querySelector<HTMLSelectElement>("#send-asset");
    const assetOption = assetSelect?.selectedOptions[0] ?? null;
    const response = await chrome.runtime.sendMessage({
      kind: "queue_solana_send",
      requestId: createRequestId("popup_solana_send"),
      surface: "popup",
      toAddress: String(formData.get("toAddress") ?? ""),
      amountFormatted: String(formData.get("amountFormatted") ?? ""),
      assetType: assetOption?.dataset.assetType === "spl" ? "spl" : "native",
      tokenAddress: assetOption?.dataset.tokenAddress || null,
      symbol: assetOption?.dataset.symbol || "SOL",
      decimals: assetOption?.dataset.decimals ? Number(assetOption.dataset.decimals) : 9,
      balanceRaw: assetOption?.dataset.balanceRaw || null,
    }) as ExtensionRuntimeResponse;

    if (!response.ok) {
      setPopupFeedback(response.error?.message ?? "Unable to queue Solana send.");
      return;
    }

    clearPopupFeedback();
    await loadPopupState();
  });
}

function wireEvmSwapForm(scope: ParentNode = root): void {
  const form = scope.querySelector<HTMLFormElement>("#evm-swap-form");

  if (!form) {
    return;
  }

  const chainSelect = form.querySelector<HTMLSelectElement>("#swap-chain");
  const sellSelect = form.querySelector<HTMLSelectElement>("#swap-sell-token");
  const buySelect = form.querySelector<HTMLSelectElement>("#swap-buy-token");
  const result = form.querySelector<HTMLElement>("#evm-swap-result");

  chainSelect?.addEventListener("change", () => {
    const assets = getEvmSwapAssets(chainSelect.value);
    if (sellSelect) {
      sellSelect.innerHTML = assets.map((asset) => renderSwapAssetOption(asset)).join("");
    }
    if (buySelect) {
      buySelect.innerHTML = assets.map((asset, index) => renderSwapAssetOption(asset, index === Math.min(1, assets.length - 1))).join("");
    }
    if (result) {
      result.innerHTML = "";
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!result || !sellSelect || !buySelect || !chainSelect) {
      return;
    }

    const evmProfile = currentPopupState.extensionVaultStatus.profiles.find((profile) => profile.chainFamily === "evm")
      ?? currentPopupState.walletExposedAccounts.find((profile) => profile.chainFamily === "evm")
      ?? null;

    if (!evmProfile) {
      result.innerHTML = `<p class="copy">Create or import an EVM account before swapping.</p>`;
      return;
    }

    const formData = new FormData(form);
    const amountRaw = String(formData.get("amountRaw") ?? "").trim();
    const slippageBps = Number(formData.get("slippageBps") ?? 50);

    result.innerHTML = `<p class="copy">Fetching 0x quote...</p>`;

    try {
      const quote = await fetchEvmSwapQuote({
        chainId: Number(chainSelect.value),
        sellToken: sellSelect.value,
        buyToken: buySelect.value,
        sellAmount: amountRaw,
        taker: evmProfile.account,
        slippageBps,
      });

      result.innerHTML = renderEvmSwapQuotePreview(quote, slippageBps);
      wireEvmSwapQuoteButtons(result, quote, slippageBps);
    } catch (error) {
      result.innerHTML = `<p class="copy">${escapeHtml(error instanceof Error ? error.message : "Unable to fetch quote.")}</p>`;
    }
  });
}

async function fetchEvmSwapQuote(input: {
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  taker: string;
  slippageBps: number;
}): Promise<EvmSwapQuoteResponse> {
  const params = new URLSearchParams({
    chainId: String(input.chainId),
    sellToken: input.sellToken,
    buyToken: input.buyToken,
    sellAmount: input.sellAmount,
    taker: input.taker,
    slippageBps: String(input.slippageBps),
  });

  for (const base of EXTENSION_SWAP_API_BASES) {
    try {
      const response = await fetch(`${base}/api/swap/evm/0x/quote?${params.toString()}`);
      const payload = await response.json().catch(() => null) as (EvmSwapQuoteResponse & { error?: string; message?: string }) | null;

      if (response.ok && payload?.provider === "0x") {
        return payload;
      }

      if (payload?.error === "swap_provider_not_configured") {
        throw new Error("0x provider is not configured on the backend yet.");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("0x provider")) {
        throw error;
      }
    }
  }

  throw new Error("0x quote API is unavailable.");
}

function renderEvmSwapQuotePreview(
  quote: EvmSwapQuoteResponse,
  slippageBps: number,
): string {
  const sellFormatted = shortenFormattedEvmTokenAmount(
    quote.sellAmountRaw,
    quote.sellToken.decimals,
  );
  const buyFormatted = shortenFormattedEvmTokenAmount(
    quote.buyAmountRaw,
    quote.buyToken.decimals,
  );
  const minBuyFormatted = quote.minBuyAmountRaw
    ? shortenFormattedEvmTokenAmount(quote.minBuyAmountRaw, quote.buyToken.decimals)
    : "n/a";
  const approval = quote.approvalRequired && quote.approval
    ? `
      <label class="small" style="display:flex;align-items:center;gap:8px">
        <span>Approval mode</span>
        <select id="evm-approval-mode">
          <option value="exact">Exact</option>
          <option value="infinite">Infinite</option>
        </select>
      </label>
      <button class="ghost-button" type="button" id="evm-approve-token">Approve ${escapeHtml(quote.sellToken.symbol)}</button>
    `
    : "";

  return `
    <div class="approval-card">
      <div class="row"><strong>0x quote</strong><span class="badge">${escapeHtml(quote.routeSummary.label)}</span></div>
      <dl>
        <div><dt>You pay</dt><dd>${escapeHtml(sellFormatted)} ${escapeHtml(quote.sellToken.symbol)}</dd></div>
        <div><dt>You receive</dt><dd>${escapeHtml(buyFormatted)} ${escapeHtml(quote.buyToken.symbol)}</dd></div>
        <div><dt>Min received</dt><dd>${escapeHtml(minBuyFormatted)} ${escapeHtml(quote.buyToken.symbol)}</dd></div>
        <div><dt>Slippage</dt><dd>${escapeHtml(String(slippageBps / 100))}%</dd></div>
        <div><dt>Gas</dt><dd>${escapeHtml(quote.gas ?? "estimate unavailable")}</dd></div>
        ${quote.approvalRequired && quote.approval ? `<div><dt>Allowance</dt><dd>${escapeHtml(quote.approval.currentAllowanceRaw ? shortenFormattedEvmTokenAmount(quote.approval.currentAllowanceRaw, quote.sellToken.decimals) : "0")} / ${escapeHtml(shortenFormattedEvmTokenAmount(quote.approval.requiredAllowanceRaw ?? quote.sellAmountRaw, quote.sellToken.decimals))} ${escapeHtml(quote.sellToken.symbol)}</dd></div>` : ""}
      </dl>
      ${quote.warnings.length ? `<p class="copy">${quote.warnings.map(escapeHtml).join(" ")}</p>` : ""}
      <div class="row" style="margin-top:10px">
        ${approval}
        <button class="primary-button" type="button" id="evm-review-swap">Review swap</button>
      </div>
    </div>
  `;
}

function wireEvmSwapQuoteButtons(
  scope: HTMLElement,
  quote: EvmSwapQuoteResponse,
  slippageBps: number,
): void {
  scope.querySelector<HTMLButtonElement>("#evm-approve-token")?.addEventListener("click", async () => {
    if (!quote.approval) {
      return;
    }

    const approvalMode = scope.querySelector<HTMLSelectElement>("#evm-approval-mode")?.value === "infinite"
      ? "infinite"
      : "exact";

    const response = await chrome.runtime.sendMessage({
      kind: "queue_evm_approve_token",
      requestId: createRequestId("popup_evm_approve"),
      surface: "popup",
      chainId: quote.chainId,
      tokenAddress: quote.approval.tokenAddress,
      tokenSymbol: quote.sellToken.symbol,
      tokenDecimals: quote.sellToken.decimals,
      spender: quote.approval.spender,
      amountRaw: quote.approval.requiredAllowanceRaw ?? quote.sellAmountRaw,
      amountFormatted: shortenFormattedEvmTokenAmount(
        quote.approval.requiredAllowanceRaw ?? quote.sellAmountRaw,
        quote.sellToken.decimals,
      ),
      currentAllowanceRaw: quote.approval.currentAllowanceRaw ?? null,
      requiredAllowanceRaw: quote.approval.requiredAllowanceRaw ?? quote.sellAmountRaw,
      approvalMode,
    }) as ExtensionRuntimeResponse;

    if (!response.ok) {
      setPopupFeedback(response.error?.message ?? "Unable to queue token approval.");
    } else {
      clearPopupFeedback();
      await loadPopupState();
    }
  });

  scope.querySelector<HTMLButtonElement>("#evm-review-swap")?.addEventListener("click", async () => {
    const response = await chrome.runtime.sendMessage({
      kind: "queue_evm_swap_approval",
      requestId: createRequestId("popup_evm_swap"),
      surface: "popup",
      quote,
      slippageBps,
    }) as ExtensionRuntimeResponse;

    if (!response.ok) {
      setPopupFeedback(response.error?.message ?? "Unable to queue swap.");
    } else {
      clearPopupFeedback();
      await loadPopupState();
    }
  });
}

function wireInlineButtons(scope: HTMLElement): void {
  scope.querySelectorAll<HTMLButtonElement>("[data-action], [data-open-url], [data-copy]").forEach((button) => {
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

      if (action === "close-action-panel") {
        const panel = root.querySelector<HTMLElement>("#action-panel");
        if (panel) {
          panel.hidden = true;
        }
        return;
      }

      if (action === "open-action-panel" && targetId) {
        openActionPanel(targetId);
      }
    });
  });
}

function validatePopupPasscode(form: HTMLFormElement): string | null {
  const formData = new FormData(form);
  const passcode = String(formData.get("passcode") ?? "").trim();
  const confirmPasscode = String(formData.get("confirmPasscode") ?? "").trim();

  if (passcode.length < 8) {
    return "Choose a wallet password with at least 8 characters.";
  }

  if (passcode !== confirmPasscode) {
    return "Password confirmation does not match.";
  }

  return null;
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
        setPopupFeedback(response.error?.message ?? "Unable to unlock wallet.");
        return;
      }

      clearPopupFeedback();
      await loadPopupState();
    });

  root
    .querySelector<HTMLFormElement>("#create-wallet-form")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      const passcodeError = validatePopupPasscode(form);
      if (passcodeError) {
        setPopupFeedback(passcodeError);
        return;
      }

      const formData = new FormData(form);
      const response = (await chrome.runtime.sendMessage({
        kind: "create_extension_wallet",
        requestId: createRequestId("popup"),
        surface: "popup",
        name: String(formData.get("name") ?? "Main wallet"),
        passcode: String(formData.get("passcode") ?? "").trim(),
      })) as ExtensionRuntimeResponse;

      if (response.ok && response.result) {
        const result = response.result as { mnemonic?: string };
        lastCreatedMnemonic = result.mnemonic ?? null;
        clearPopupFeedback();
      } else {
        lastCreatedMnemonic = null;
        setPopupFeedback(response.error?.message ?? "Unable to create wallet.");
        return;
      }

      await loadPopupState();
    });

  root
    .querySelector<HTMLFormElement>("#import-wallet-form")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      const passcodeError = validatePopupPasscode(form);
      if (passcodeError) {
        setPopupFeedback(passcodeError);
        return;
      }

      const formData = new FormData(form);
      const response = (await chrome.runtime.sendMessage({
        kind: "import_extension_wallet",
        requestId: createRequestId("popup"),
        surface: "popup",
        name: String(formData.get("name") ?? "Imported wallet"),
        mnemonic: String(formData.get("mnemonic") ?? ""),
        passcode: String(formData.get("passcode") ?? "").trim(),
      })) as ExtensionRuntimeResponse;

      if (!response.ok) {
        setPopupFeedback(response.error?.message ?? "Unable to import wallet.");
        return;
      }

      clearPopupFeedback();
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
    <button class="quick-action" type="button" data-open-url="https://24wallet.ru${target}">
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
          <button class="primary-button" type="button" data-open-url="https://24wallet.ru/buy">Open Buy</button>
        </div>
      `;
    case "swap":
      return renderEvmSwapComposer();
    case "send":
      return renderSendComposer();
    case "activity":
      return renderActivityComposer(currentPopupState);
    case "settings":
      return renderSettingsComposer();
    case "receive":
    default:
      return renderReceiveComposer(currentPopupState, currentHomeSnapshot);
  }
}

function renderActivityComposer(state: BackgroundStateSnapshot): string {
  const items = state.activityLog.slice(0, 18);

  return `
    <div class="settings-sheet">
      <button class="settings-back as-button" type="button" data-action="close-action-panel" data-id="activity">← Activity</button>
      <div class="settings-section-label">Recent wallet activity</div>
      ${items.length
        ? items.map((item) => `
          <div class="settings-row activity-row">
            <span class="settings-icon">${escapeHtml(activityIcon(item.kind))}</span>
            <span>
              <span class="settings-label">${escapeHtml(item.kind.replace(/_/gu, " "))}</span>
              <span class="token-meta">
                ${escapeHtml((item.amountFormatted ?? `${item.sellTokenSymbol ?? item.tokenSymbol ?? ""}${item.buyAmountFormatted ? ` -> ${item.buyAmountFormatted} ${item.buyTokenSymbol ?? ""}` : ""}`.trim()) || item.account)}
              </span>
            </span>
            <span class="badge">${escapeHtml(item.status)}</span>
          </div>
        `).join("")
        : `<p class="copy">No approvals, sends, swaps, or dApp sessions have been recorded in this extension yet.</p>`}
      <button class="ghost-button" type="button" data-action="close-action-panel" data-id="activity">Back to wallet</button>
    </div>
  `;
}

function activityIcon(kind: string): string {
  if (kind.includes("swap")) {
    return "⇄";
  }

  if (kind.includes("send")) {
    return "↗";
  }

  if (kind.includes("approval")) {
    return "✓";
  }

  if (kind.includes("sign")) {
    return "✎";
  }

  return "•";
}

function renderSettingsComposer(): string {
  const settings = currentPopupSettings;

  return `
    <form class="settings-sheet" id="extension-settings-form">
      <button class="settings-back as-button" type="button" data-action="close-action-panel" data-id="settings">← Settings</button>
      <div class="settings-section-label">Preferences</div>
      ${renderSettingsRow("◐", "Theme", renderThemeSegment(settings.theme))}
      ${renderSettingsRow("◉", "Display currency", renderSettingsSelect(
        "currency",
        settings.currency,
        POPUP_CURRENCIES.map((currency) => ({ label: currency, value: currency })),
      ))}
      ${renderSettingsRow("文", "Language", renderSettingsSelect(
        "language",
        settings.language,
        POPUP_LANGUAGES.map((language) => ({ label: language, value: language })),
      ))}
      ${renderSettingsRow("▮", "Balances and activity", `<button class="settings-link" type="button" data-action="open-action-panel" data-id="activity">Open ›</button>`)}
      <div class="settings-section-label">Security and privacy</div>
      ${renderSettingsRow("⌁", "Allow analytics", `<span class="toggle on"><span></span></span>`)}
      <div class="settings-section-label">Developer tools</div>
      ${renderSettingsRow("▤", "App data", `<span>›</span>`)}
      ${renderSettingsRow("⚒", "Testnet mode", `<span class="toggle"><span></span></span>`)}
      <p class="copy" id="extension-settings-status">Theme, currency, and language are stored only in this browser profile.</p>
      <button class="primary-button" type="submit">Save settings</button>
      <button class="ghost-button" type="button" data-open-url="options.html">Open provider diagnostics</button>
    </form>
  `;
}

function renderThemeSegment(theme: ExtensionPopupSettings["theme"]): string {
  return `
    <span class="segmented theme-segment">
      ${(["auto", "light", "dark"] as const).map((value) => `
        <label data-active="${theme === value}">
          <input type="radio" name="theme" value="${value}" ${theme === value ? "checked" : ""}>
          <span>${value === "auto" ? "Auto" : value === "light" ? "☼" : "☾"}</span>
        </label>
      `).join("")}
    </span>
  `;
}

function renderSettingsSelect(
  name: keyof Pick<ExtensionPopupSettings, "currency" | "language">,
  selectedValue: string,
  options: Array<{ label: string; value: string }>,
): string {
  return `
    <select class="mini-select" name="${escapeHtml(name)}">
      ${options.map((option) => `
        <option value="${escapeHtml(option.value)}" ${option.value === selectedValue ? "selected" : ""}>
          ${escapeHtml(option.label)}
        </option>
      `).join("")}
    </select>
  `;
}

function renderSettingsRow(icon: string, label: string, value: string): string {
  return `
    <div class="settings-row">
      <span class="settings-icon">${icon}</span>
      <span class="settings-label">${escapeHtml(label)}</span>
      <span class="settings-value">${value}</span>
    </div>
  `;
}

function renderSendComposer(): string {
  const networks = currentHomeSnapshot?.networks ?? [];
  const solana = networks.find((network) => network.family === "solana");
  const solanaAssets = getSolanaSendAssets();

  return `
    <form class="form" id="solana-send-form">
      <label class="small">Network</label>
      <select class="field" id="send-network" name="chainId">
        ${networks
          .filter((network) => network.family !== "utxo" && network.family !== "ton")
          .map((network) => `
            <option value="${escapeHtml(String(network.chainId))}" data-family="${escapeHtml(network.family)}" ${String(network.chainId) === String(solana?.chainId) ? "selected" : ""}>
              ${escapeHtml(network.name)}
            </option>
          `)
          .join("")}
      </select>
      <label class="small">Asset</label>
      <select class="field" id="send-asset" name="assetId">
        ${solanaAssets.map((asset) => `
          <option
            value="${escapeHtml(buildPopupAssetId(asset))}"
            data-asset-type="${escapeHtml(asset.type === "spl" ? "spl" : "native")}"
            data-token-address="${escapeHtml(asset.tokenAddress ?? "")}"
            data-symbol="${escapeHtml(asset.symbol)}"
            data-decimals="${escapeHtml(String(asset.decimals))}"
            data-balance-raw="${escapeHtml(asset.balanceRaw)}"
          >
            ${escapeHtml(asset.symbol)} · ${escapeHtml(asset.balanceFormatted)} available
          </option>
        `).join("")}
      </select>
      <input class="field" name="toAddress" placeholder="Solana recipient address" autocomplete="off">
      <input class="field" name="amountFormatted" placeholder="Amount" inputmode="decimal">
      <p class="copy" id="send-support-note">SOL and SPL sends are queued for explicit popup confirmation. Missing recipient token accounts are shown in review.</p>
      <button class="primary-button" type="submit">Review Solana Send</button>
      <button class="ghost-button" type="button" data-open-url="https://24wallet.ru/send">Open full send</button>
    </form>
  `;
}

function renderEvmSwapComposer(): string {
  const networks = (currentHomeSnapshot?.networks ?? [])
    .filter((network) => network.family === "evm" && network.capabilities.swap);
  const selectedNetwork = networks.find((network) =>
    String(network.chainId) === String(currentHomeSnapshot?.activeChainId),
  ) ?? networks[0] ?? null;
  const assets = getEvmSwapAssets(selectedNetwork?.chainId ?? 1);
  const defaultBuy = assets.find((asset) => asset.symbol === "USDC" && asset.type === "erc20")
    ?? assets.find((asset) => asset.type === "erc20")
    ?? assets[0];

  return `
    <form class="form" id="evm-swap-form">
      <label class="small">Network</label>
      <select class="field" id="swap-chain" name="chainId">
        ${networks.map((network) => `
          <option value="${escapeHtml(String(network.chainId))}" ${String(network.chainId) === String(selectedNetwork?.chainId) ? "selected" : ""}>
            ${escapeHtml(network.name)}
          </option>
        `).join("")}
      </select>
      <label class="small">Sell token</label>
      <select class="field" id="swap-sell-token" name="sellToken">
        ${assets.map((asset) => renderSwapAssetOption(asset)).join("")}
      </select>
      <label class="small">Buy token</label>
      <select class="field" id="swap-buy-token" name="buyToken">
        ${assets.map((asset) => renderSwapAssetOption(asset, asset === defaultBuy)).join("")}
      </select>
      <input class="field" name="amountRaw" placeholder="Sell amount in raw units, e.g. 1000000" inputmode="numeric">
      <select class="field" name="slippageBps">
        <option value="30">0.3% slippage</option>
        <option value="50" selected>0.5% slippage</option>
        <option value="100">1% slippage</option>
      </select>
      <p class="copy">0x quotes are loaded through the Acorus backend. Approval and swap broadcasts require explicit popup confirmation.</p>
      <button class="primary-button" type="submit">Get 0x Quote</button>
      <button class="ghost-button" type="button" data-open-url="https://24wallet.ru/swap">Open full swap</button>
      <div id="evm-swap-result" class="swap-result"></div>
    </form>
  `;
}

function renderSwapAssetOption(
  asset: ExtensionPortfolioSnapshot["assets"][number],
  selected = false,
): string {
  const token = asset.type === "native" ? "native" : asset.tokenAddress ?? "";

  return `
    <option
      value="${escapeHtml(token)}"
      data-symbol="${escapeHtml(asset.symbol)}"
      data-decimals="${escapeHtml(String(asset.decimals))}"
      data-type="${escapeHtml(asset.type)}"
      ${selected ? "selected" : ""}
    >
      ${escapeHtml(asset.symbol)} · ${escapeHtml(asset.name)}
    </option>
  `;
}

function getEvmSwapAssets(chainId: string | number): ExtensionPortfolioSnapshot["assets"] {
  const chain = currentHomeSnapshot?.networks.find((network) =>
    String(network.chainId) === String(chainId),
  );
  const assets = currentHomeSnapshot?.assets.filter((asset) =>
    asset.family === "evm" && String(asset.chainId) === String(chainId),
  ) ?? [];
  const native = assets.find((asset) => asset.type === "native") ?? {
    family: "evm",
    chainId,
    type: "native",
    symbol: chain?.nativeSymbol ?? "ETH",
    name: chain?.name ?? "Ethereum",
    decimals: 18,
    tokenAddress: null,
    balanceRaw: "0",
    balanceFormatted: "0",
    fiatValue: null,
    priceUsd: null,
    source: "fallback",
  };
  const usdc = chainId === 1
    ? {
        family: "evm",
        chainId,
        type: "erc20",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        balanceRaw: "0",
        balanceFormatted: "0",
        fiatValue: null,
        priceUsd: null,
        source: "curated",
      }
    : null;
  const merged = [native, ...assets.filter((asset) => asset.type === "erc20")];

  if (usdc && !merged.some((asset) => asset.tokenAddress?.toLowerCase() === usdc.tokenAddress.toLowerCase())) {
    merged.push(usdc);
  }

  return merged;
}

function getSolanaSendAssets(): ExtensionPortfolioSnapshot["assets"] {
  const assets = currentHomeSnapshot?.assets.filter((asset) => asset.family === "solana") ?? [];
  const hasSol = assets.some((asset) => asset.type === "native" && asset.symbol === "SOL");

  return hasSol
    ? assets
    : [
      {
        family: "solana",
        chainId: 101,
        type: "native",
        symbol: "SOL",
        name: "Solana",
        decimals: 9,
        tokenAddress: null,
        balanceRaw: "0",
        balanceFormatted: "0",
        fiatValue: null,
        priceUsd: null,
        source: "unavailable",
      },
      ...assets,
    ];
}

function buildPopupAssetId(asset: ExtensionPortfolioSnapshot["assets"][number]): string {
  return [
    asset.family,
    String(asset.chainId),
    asset.type,
    asset.tokenAddress?.toLowerCase() ?? "native",
    asset.symbol.toUpperCase(),
  ].join(":");
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

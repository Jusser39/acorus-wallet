import {
  PREVIEW_DAPP_BRIDGE_ACCOUNT,
  PREVIEW_DAPP_BRIDGE_CHAIN_IDS,
  approveDappProposal,
  approveDappRequest,
  createDappBridgeSessionView,
  createDemoDappShellSnapshot,
  ensureDappConnectionProposal,
  getActiveDappSession,
  getChainsByFamily,
  rejectDappProposal,
  rejectDappRequest,
  revokeDappSession,
  setDappSessionActiveChain,
  touchDappSession,
  type ChainId,
  type DappBridgeSessionView,
  type DappProviderExposureMode,
  type DappShellSnapshot,
  type DappWalletExposure,
  type DappWalletSyncEnvelope,
} from "@acorus/shared";

const DAPP_SHELL_STATE_KEY = "acorus_dapp_shell_state";
const DAPP_WALLET_SYNC_KEY = "acorus_dapp_wallet_sync_state";

type DappWalletSyncState = {
  activeProfileId: string | null;
  profiles: DappWalletExposure[];
  lastSyncedAt: string | null;
};

const EMPTY_WALLET_SYNC_STATE: DappWalletSyncState = {
  activeProfileId: null,
  profiles: [],
  lastSyncedAt: null,
};

type ResolvedBridgeWalletState = {
  providerMode: DappProviderExposureMode;
  accounts: string[];
  chainIds: ChainId[];
};

export async function getDappShellState(): Promise<DappShellSnapshot> {
  const result = await chrome.storage.local.get(DAPP_SHELL_STATE_KEY);
  const value = result[DAPP_SHELL_STATE_KEY];

  if (value && typeof value === "object") {
    return value as DappShellSnapshot;
  }

  const seeded = reconcileSnapshotWithWalletState(
    createDemoDappShellSnapshot(),
    await getWalletSyncState(),
  );
  await setDappShellState(seeded);
  return seeded;
}

export async function initializePermissionStore(): Promise<void> {
  await getDappShellState();
}

export async function setDappShellState(
  state: DappShellSnapshot,
): Promise<void> {
  await chrome.storage.local.set({
    [DAPP_SHELL_STATE_KEY]: state,
  });
}

export async function getWalletSyncState(): Promise<DappWalletSyncState> {
  const result = await chrome.storage.local.get(DAPP_WALLET_SYNC_KEY);
  const value = result[DAPP_WALLET_SYNC_KEY];

  if (value && typeof value === "object") {
    const candidate = value as Partial<DappWalletSyncState>;
    return {
      activeProfileId:
        typeof candidate.activeProfileId === "string"
          ? candidate.activeProfileId
          : null,
      profiles: Array.isArray(candidate.profiles)
        ? candidate.profiles.filter(isWalletExposure)
        : [],
      lastSyncedAt:
        typeof candidate.lastSyncedAt === "string"
          ? candidate.lastSyncedAt
          : null,
    };
  }

  return EMPTY_WALLET_SYNC_STATE;
}

export async function syncWalletProfiles(
  payload: DappWalletSyncEnvelope,
): Promise<DappWalletSyncState> {
  const nextState = buildWalletSyncState(payload);
  await chrome.storage.local.set({
    [DAPP_WALLET_SYNC_KEY]: nextState,
  });

  const current = await getDappShellState();
  await setDappShellState(reconcileSnapshotWithWalletState(current, nextState));

  return nextState;
}

export async function approveProposal(proposalId: string): Promise<DappShellSnapshot> {
  const next = approveDappProposal(await getDappShellState(), proposalId);
  await setDappShellState(next);
  return next;
}

export async function rejectProposal(proposalId: string): Promise<DappShellSnapshot> {
  const next = rejectDappProposal(await getDappShellState(), proposalId);
  await setDappShellState(next);
  return next;
}

export async function approveRequestInQueue(
  requestId: string,
): Promise<DappShellSnapshot> {
  const next = approveDappRequest(await getDappShellState(), requestId);
  await setDappShellState(next);
  return next;
}

export async function rejectRequestInQueue(
  requestId: string,
): Promise<DappShellSnapshot> {
  const next = rejectDappRequest(await getDappShellState(), requestId);
  await setDappShellState(next);
  return next;
}

export async function revokeSessionInRegistry(
  sessionId: string,
): Promise<DappShellSnapshot> {
  const next = revokeDappSession(await getDappShellState(), sessionId);
  await setDappShellState(next);
  return next;
}

export async function getOriginBridgeState(
  origin: string,
): Promise<DappBridgeSessionView> {
  return createDappBridgeSessionView(await getDappShellState(), origin);
}

export async function ensureOriginConnectionProposal(
  origin: string,
): Promise<DappBridgeSessionView> {
  const current = await getDappShellState();
  const walletState = resolveBridgeWalletState(await getWalletSyncState());
  const ensured = ensureDappConnectionProposal(current, {
    origin,
    providerMode: walletState.providerMode,
    requestedAccounts: walletState.accounts,
    requestedChainIds: walletState.chainIds,
    warning:
      walletState.providerMode === "wallet_backed"
        ? "Approve to expose synced local Acorus EVM accounts to this site. Mnemonic, private keys, passcode, signing output, and broadcast remain blocked."
        : undefined,
  });

  if (ensured.created) {
    await setDappShellState(ensured.snapshot);
  }

  return createDappBridgeSessionView(ensured.snapshot, origin);
}

export async function touchOriginSession(
  origin: string,
): Promise<DappBridgeSessionView> {
  const current = await getDappShellState();
  const session = getActiveDappSession(current, origin);

  if (!session) {
    return createDappBridgeSessionView(current, origin);
  }

  const next = touchDappSession(current, session.id);
  await setDappShellState(next);
  return createDappBridgeSessionView(next, origin);
}

export async function switchOriginSessionChain(
  origin: string,
  chainId: ChainId,
): Promise<DappBridgeSessionView> {
  const current = await getDappShellState();
  const session = getActiveDappSession(current, origin);

  if (!session) {
    return createDappBridgeSessionView(current, origin);
  }

  const next = setDappSessionActiveChain(current, session.id, chainId);
  await setDappShellState(next);
  return createDappBridgeSessionView(next, origin);
}

function buildWalletSyncState(
  payload: DappWalletSyncEnvelope,
): DappWalletSyncState {
  const evmChainIds = getChainsByFamily("evm").map((chain) => chain.chainId as ChainId);
  const eligibleProfiles = payload.profiles.filter(
    (profile) => profile.chainFamily === "evm" && profile.type === "local",
  );
  const resolvedActiveProfileId = eligibleProfiles.some(
    (profile) => profile.id === payload.activeProfileId,
  )
    ? payload.activeProfileId ?? null
    : eligibleProfiles[0]?.id ?? null;

  const profiles = eligibleProfiles
    .map<DappWalletExposure>((profile) => ({
      profileId: profile.id,
      name: profile.name,
      account: profile.publicAddress,
      chainFamily: profile.chainFamily,
      chainIds: evmChainIds,
      selected: profile.id === resolvedActiveProfileId,
    }))
    .sort((left, right) => Number(right.selected) - Number(left.selected));

  return {
    activeProfileId: resolvedActiveProfileId,
    profiles,
    lastSyncedAt: payload.syncedAt,
  };
}

function resolveBridgeWalletState(
  walletState: DappWalletSyncState,
): ResolvedBridgeWalletState {
  if (walletState.profiles.length === 0) {
    return {
      providerMode: "preview_accounts",
      accounts: [PREVIEW_DAPP_BRIDGE_ACCOUNT],
      chainIds: PREVIEW_DAPP_BRIDGE_CHAIN_IDS,
    };
  }

  return {
    providerMode: "wallet_backed",
    accounts: walletState.profiles.map((profile) => profile.account),
    chainIds: [...new Set(walletState.profiles.flatMap((profile) => profile.chainIds))],
  };
}

function reconcileSnapshotWithWalletState(
  snapshot: DappShellSnapshot,
  walletState: DappWalletSyncState,
): DappShellSnapshot {
  const bridgeWalletState = resolveBridgeWalletState(walletState);
  const updatedAt = new Date().toISOString();

  const sessions = snapshot.sessions.map((session) => ({
    ...session,
    providerMode: bridgeWalletState.providerMode,
    accounts: bridgeWalletState.accounts,
    chainIds: bridgeWalletState.chainIds,
    activeChainId: bridgeWalletState.chainIds.includes(session.activeChainId ?? -1)
      ? session.activeChainId
      : (bridgeWalletState.chainIds[0] ?? null),
    warning:
      bridgeWalletState.providerMode === "wallet_backed"
        ? "This session now exposes synced local Acorus EVM accounts after approval. Mnemonic, private keys, signing output, and send execution remain unavailable."
        : "Bridge connectivity and approval review are live in preview-backed mode only. Real signing output and broadcast remain disabled until a later execution wave.",
  }));
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));

  return {
    proposals: snapshot.proposals.map((proposal) => ({
      ...proposal,
      providerMode: bridgeWalletState.providerMode,
      requestedAccounts: bridgeWalletState.accounts,
      requestedChainIds: bridgeWalletState.chainIds,
      warning:
        bridgeWalletState.providerMode === "wallet_backed"
          ? "Approve to expose synced local Acorus EVM accounts to this site. Mnemonic, private keys, signing output, and broadcast remain blocked."
          : "Preview proposal only. A live page-to-extension bridge can queue approvals, but wallet-backed accounts are still disabled.",
    })),
    sessions,
    pendingRequests: snapshot.pendingRequests.map((request) => {
      const session = request.sessionId
        ? sessionsById.get(request.sessionId) ?? null
        : null;

      return {
        ...request,
        account: session?.accounts[0] ?? bridgeWalletState.accounts[0] ?? null,
        chainId:
          session?.activeChainId
          ?? bridgeWalletState.chainIds[0]
          ?? request.chainId
          ?? null,
        warning:
          bridgeWalletState.providerMode === "wallet_backed"
            ? "Approval review now targets a synced local Acorus wallet account. Real signatures and broadcast remain disabled in this wave."
            : "Preview request only. No signature will be produced in this wave.",
      };
    }),
    approvalResults: snapshot.approvalResults,
    updatedAt,
  };
}

function isWalletExposure(value: unknown): value is DappWalletExposure {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<DappWalletExposure>;
  return (
    typeof candidate.profileId === "string"
    && typeof candidate.name === "string"
    && typeof candidate.account === "string"
    && typeof candidate.chainFamily === "string"
    && Array.isArray(candidate.chainIds)
    && typeof candidate.selected === "boolean"
  );
}

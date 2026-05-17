import {
  buildDappProposalWarning,
  buildDappRequestWarning,
  buildDappSessionWarning,
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
  queueSessionRequestPreview,
  queueWalletConnectPairing,
  setDappSessionActiveChain,
  touchDappSession,
  type ChainId,
  type DappRequestKind,
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
    return normalizeStoredSnapshot(value as DappShellSnapshot);
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

export async function selectWalletProfile(
  profileId: string,
): Promise<DappWalletSyncState> {
  const current = await getWalletSyncState();
  const exists = current.profiles.some((profile) => profile.profileId === profileId);

  if (!exists) {
    return current;
  }

  const nextState: DappWalletSyncState = {
    activeProfileId: profileId,
    profiles: current.profiles
      .map((profile) => ({
        ...profile,
        selected: profile.profileId === profileId,
      }))
      .sort((left, right) => Number(right.selected) - Number(left.selected)),
    lastSyncedAt: current.lastSyncedAt,
  };

  await chrome.storage.local.set({
    [DAPP_WALLET_SYNC_KEY]: nextState,
  });

  const snapshot = await getDappShellState();
  await setDappShellState(reconcileSnapshotWithWalletState(snapshot, nextState));

  return nextState;
}

export async function setSessionAccount(
  sessionId: string,
  profileId: string,
): Promise<DappShellSnapshot> {
  const walletState = await getWalletSyncState();
  const exposure = walletState.profiles.find((profile) => profile.profileId === profileId);

  if (!exposure) {
    return getDappShellState();
  }

  const current = await getDappShellState();
  if (!current.sessions.some((session) => session.id === sessionId)) {
    return current;
  }

  const updatedAt = new Date().toISOString();
  const sessions = current.sessions.map((session) =>
    session.id === sessionId
      ? {
          ...session,
          providerMode: "wallet_backed" as const,
          accounts: [exposure.account],
          chainIds: exposure.chainIds,
          activeChainId: exposure.chainIds.includes(session.activeChainId ?? -1)
            ? session.activeChainId
            : (exposure.chainIds[0] ?? null),
          lastUsedAt: updatedAt,
          warning: buildDappSessionWarning({
            transport: session.transport,
            providerMode: "wallet_backed",
          }),
        }
      : session,
  );
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));
  const next: DappShellSnapshot = {
    ...current,
    sessions,
    pendingRequests: current.pendingRequests.map((request) => {
      const session = request.sessionId
        ? sessionsById.get(request.sessionId) ?? null
        : null;

      return request.sessionId === sessionId
        ? {
            ...request,
            account: session?.accounts[0] ?? request.account ?? null,
            chainId: session?.activeChainId ?? request.chainId ?? null,
            warning: buildDappRequestWarning({
              transport: request.transport,
            }),
          }
        : request;
    }),
    updatedAt,
  };

  await setDappShellState(next);
  return next;
}

export async function queueWalletConnectPairingProposal(
  uri: string,
  title?: string,
): Promise<DappShellSnapshot> {
  const current = await getDappShellState();
  const walletState = resolveBridgeWalletState(await getWalletSyncState());
  const ensured = queueWalletConnectPairing(current, {
    uri,
    title,
    providerMode: walletState.providerMode,
    requestedAccounts: walletState.accounts,
    requestedChainIds: walletState.chainIds,
  });

  if (ensured.created) {
    await setDappShellState(ensured.snapshot);
  }

  return ensured.snapshot;
}

export async function queueSessionRequestPreviewForSession(
  sessionId: string,
  kind: Exclude<DappRequestKind, "connect">,
  chainId?: ChainId | null,
  summary?: string,
): Promise<DappShellSnapshot> {
  const current = await getDappShellState();
  const queued = queueSessionRequestPreview(current, {
    sessionId,
    kind,
    chainId,
    summary,
  });

  if (queued.created) {
    await setDappShellState(queued.snapshot);
  }

  return queued.snapshot;
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
        ? "Approve to expose the selected synced Acorus EVM account to this site. Mnemonic, private keys, passcode, signing output, and broadcast remain blocked."
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

  const selectedProfile = walletState.profiles.find((profile) => profile.selected)
    ?? walletState.profiles[0]
    ?? null;

  return {
    providerMode: "wallet_backed",
    accounts: selectedProfile ? [selectedProfile.account] : [],
    chainIds: selectedProfile
      ? [...new Set(selectedProfile.chainIds)]
      : [],
  };
}

function reconcileSnapshotWithWalletState(
  snapshot: DappShellSnapshot,
  walletState: DappWalletSyncState,
): DappShellSnapshot {
  const bridgeWalletState = resolveBridgeWalletState(walletState);
  const updatedAt = new Date().toISOString();
  const exposuresByAccount = new Map(
    walletState.profiles.map((profile) => [profile.account, profile]),
  );
  const selectedExposure = walletState.profiles.find((profile) => profile.selected)
    ?? walletState.profiles[0]
    ?? null;
  const sessions = snapshot.sessions.map((session) => {
    const pinnedExposure = session.accounts[0]
      ? exposuresByAccount.get(session.accounts[0]) ?? null
      : null;
    const resolvedExposure = pinnedExposure ?? selectedExposure;
    const chainIds = resolvedExposure?.chainIds ?? bridgeWalletState.chainIds;

    return {
      ...session,
      providerMode: bridgeWalletState.providerMode,
      accounts: resolvedExposure
        ? [resolvedExposure.account]
        : bridgeWalletState.accounts,
      chainIds,
      activeChainId: chainIds.includes(session.activeChainId ?? -1)
        ? session.activeChainId
        : (chainIds[0] ?? null),
      warning:
        buildDappSessionWarning({
          transport: session.transport,
          providerMode: bridgeWalletState.providerMode,
        }),
    };
  });
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));

  return {
    proposals: snapshot.proposals.map((proposal) => ({
      ...proposal,
      providerMode: bridgeWalletState.providerMode,
      requestedAccounts: bridgeWalletState.accounts,
      requestedChainIds: bridgeWalletState.chainIds,
      warning: buildDappProposalWarning({
        transport: proposal.transport,
        providerMode: bridgeWalletState.providerMode,
      }),
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
        warning: buildDappRequestWarning({
          transport: request.transport,
        }),
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

function normalizeStoredSnapshot(snapshot: DappShellSnapshot): DappShellSnapshot {
  const sessions = snapshot.sessions.map((session) => ({
    ...session,
    transport: session.transport ?? "injected",
  }));
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));

  return {
    ...snapshot,
    proposals: snapshot.proposals.map((proposal) => ({
      ...proposal,
      transport: proposal.transport ?? "injected",
    })),
    sessions,
    pendingRequests: snapshot.pendingRequests.map((request) => ({
      ...request,
      transport:
        request.transport
        ?? (request.sessionId
          ? sessionsById.get(request.sessionId)?.transport
          : undefined)
        ?? "injected",
    })),
  };
}

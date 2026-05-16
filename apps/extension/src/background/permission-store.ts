import {
  approveDappProposal,
  approveDappRequest,
  createDappBridgeSessionView,
  createDemoDappShellSnapshot,
  ensureDappConnectionProposal,
  getActiveDappSession,
  rejectDappProposal,
  rejectDappRequest,
  revokeDappSession,
  setDappSessionActiveChain,
  touchDappSession,
  type DappShellSnapshot,
  type DappBridgeSessionView,
  type ChainId,
} from "@acorus/shared";

const DAPP_SHELL_STATE_KEY = "acorus_dapp_shell_state";

export async function getDappShellState(): Promise<DappShellSnapshot> {
  const result = await chrome.storage.local.get(DAPP_SHELL_STATE_KEY);
  const value = result[DAPP_SHELL_STATE_KEY];

  if (value && typeof value === "object") {
    return value as DappShellSnapshot;
  }

  const seeded = createDemoDappShellSnapshot();
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
  const ensured = ensureDappConnectionProposal(current, { origin });

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

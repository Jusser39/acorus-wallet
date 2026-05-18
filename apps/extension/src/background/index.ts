import {
  createApprovedPreviewDappResult,
  createDappBridgeSessionView,
  getActiveDappSession,
  getDappSessionActiveChainId,
  getPendingDappProposal,
  getPendingDappRequest,
  hasDappPermission,
  queueDappRequest,
  type DappRequest,
  type DappRequestKind,
  type ChainId,
  type DappShellSnapshot,
} from "@acorus/shared";
import {
  type AcorusProviderMethod,
  createRequestId,
  createSkeletonState,
  isAcorusProviderMethod,
  type ExtensionRuntimeMessage,
  type ExtensionRuntimeResponse,
} from "../shared/protocol";
import {
  createExtensionWallet,
  getExtensionVaultStatus,
  importExtensionWallet,
  lockExtensionWallet,
  unlockExtensionWallet,
} from "./extension-wallet";
import {
  approveProposal,
  approveRequestInQueue,
  ensureOriginConnectionProposal,
  getWalletSyncState,
  getDappShellState,
  initializePermissionStore,
  queueSessionRequestPreviewForSession,
  queueWalletConnectPairingProposal,
  refreshDappShellWalletState,
  rejectProposal,
  rejectRequestInQueue,
  revokeSessionInRegistry,
  selectWalletProfile,
  setSessionAccount,
  setDappShellState,
  switchOriginSessionChain,
  syncWalletProfiles,
  touchOriginSession,
} from "./permission-store";

const pendingProviderApprovals = new Map<
  string,
  {
    resolve: (response: ExtensionRuntimeResponse) => void;
  }
>();
const pendingConnectionApprovals = new Map<
  string,
  {
    origin: string;
    proposalId: string | null;
    timeoutId: ReturnType<typeof setTimeout>;
    resolve: (response: ExtensionRuntimeResponse) => void;
  }
>();
const ACTIVE_PROMPT_ORIGIN_KEY = "acorus_active_prompt_origin";

chrome.runtime.onInstalled.addListener(() => {
  void initializePermissionStore();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void handleRuntimeMessage(message, sender).then(sendResponse);
  return true;
});

async function handleRuntimeMessage(
  message: unknown,
  sender: chrome.MessageSender,
): Promise<ExtensionRuntimeResponse> {
  const fallbackId = createRequestId("background");

  if (typeof message !== "object" || message === null || !("kind" in message)) {
    return {
      requestId: fallbackId,
      ok: false,
      error: {
        code: "bad_request",
        message: "Unknown extension message.",
      },
    };
  }

  const input = message as ExtensionRuntimeMessage;
  const requestId = input.requestId ?? fallbackId;

  if (input.kind === "ping") {
    return {
      requestId,
      ok: true,
      result: {
        phase: "skeleton",
        status: "ready",
        surface: input.surface,
      },
    };
  }

  if (input.kind === "get_state") {
    const state = await getDappShellState();
    const walletState = await getWalletSyncState();
    const extensionVaultStatus = await getExtensionVaultStatus();
    const activeOrigin = await resolveActiveOrigin(input.origin, sender);
    const walletExposureMode = walletState.profiles.length > 0
      ? "wallet_backed"
      : "preview_accounts";

    return {
      requestId,
      ok: true,
      result: createSkeletonState({
        activeOrigin,
        proposals: state.proposals,
        sessions: state.sessions,
        pendingRequests: state.pendingRequests,
        approvalResults: state.approvalResults,
        activeOriginBridge: activeOrigin
          ? createDappBridgeSessionView(state, activeOrigin)
          : null,
        lastUpdatedAt: state.updatedAt,
        providerInjection:
          walletExposureMode === "wallet_backed"
            ? "wallet_bridge"
            : "preview_bridge",
        walletExposureMode,
        walletExposedAccounts: walletState.profiles,
        walletLastSyncedAt: walletState.lastSyncedAt,
        extensionVaultStatus,
      }),
    };
  }

  if (input.kind === "create_extension_wallet") {
    try {
      const created = await createExtensionWallet({
        name: input.name,
        passcode: input.passcode,
      });
      await refreshDappShellWalletState();

      return {
        requestId,
        ok: true,
        result: created,
      };
    } catch (error) {
      return {
        requestId,
        ok: false,
        error: {
          code: "wallet_create_failed",
          message:
            error instanceof Error
              ? error.message
              : "Unable to create the extension wallet.",
        },
      };
    }
  }

  if (input.kind === "import_extension_wallet") {
    try {
      const imported = await importExtensionWallet({
        name: input.name,
        mnemonic: input.mnemonic,
        passcode: input.passcode,
      });
      await refreshDappShellWalletState();

      return {
        requestId,
        ok: true,
        result: imported,
      };
    } catch (error) {
      return {
        requestId,
        ok: false,
        error: {
          code: "wallet_import_failed",
          message:
            error instanceof Error
              ? error.message
              : "Unable to import the extension wallet.",
        },
      };
    }
  }

  if (input.kind === "unlock_extension_wallet") {
    try {
      return {
        requestId,
        ok: true,
        result: await unlockExtensionWallet({
          passcode: input.passcode,
        }),
      };
    } catch (error) {
      return {
        requestId,
        ok: false,
        error: {
          code: "wallet_unlock_failed",
          message:
            error instanceof Error
              ? error.message
              : "Unable to unlock the extension wallet.",
        },
      };
    }
  }

  if (input.kind === "lock_extension_wallet") {
    return {
      requestId,
      ok: true,
      result: await lockExtensionWallet(),
    };
  }

  if (input.kind === "sync_wallet_profiles") {
    const walletState = await syncWalletProfiles(input.payload);

    return {
      requestId,
      ok: true,
      result: {
        syncedProfiles: walletState.profiles.length,
        walletExposureMode:
          walletState.profiles.length > 0 ? "wallet_backed" : "preview_accounts",
        syncedAt: walletState.lastSyncedAt,
      },
    };
  }

  if (input.kind === "select_wallet_profile") {
    const walletState = await selectWalletProfile(input.profileId);

    return {
      requestId,
      ok: true,
      result: {
        selectedProfileId: walletState.activeProfileId,
      },
    };
  }

  if (input.kind === "set_session_account") {
    return {
      requestId,
      ok: true,
      result: await setSessionAccount(input.sessionId, input.profileId),
    };
  }

  if (input.kind === "queue_walletconnect_pairing") {
    try {
      return {
        requestId,
        ok: true,
        result: await queueWalletConnectPairingProposal(input.uri, input.title),
      };
    } catch (error) {
      return {
        requestId,
        ok: false,
        error: {
          code: "invalid_walletconnect_uri",
          message:
            error instanceof Error
              ? error.message
              : "WalletConnect pairing URI is invalid.",
        },
      };
    }
  }

  if (input.kind === "queue_session_request_preview") {
    try {
      return {
        requestId,
        ok: true,
        result: await queueSessionRequestPreviewForSession(
          input.sessionId,
          input.requestKind,
          input.chainId ?? undefined,
          input.summary,
        ),
      };
    } catch (error) {
      return {
        requestId,
        ok: false,
        error: {
          code: "invalid_session_request_preview",
          message:
            error instanceof Error
              ? error.message
              : "Session request preview could not be queued.",
        },
      };
    }
  }

  if (input.kind === "approve_proposal") {
    const current = await getDappShellState();
    const proposal = current.proposals.find((item) => item.id === input.proposalId);
    const next = await approveProposal(input.proposalId);

    if (proposal) {
      resolvePendingConnectionApproval(proposal.origin.origin, input.proposalId, next);
    }

    return {
      requestId,
      ok: true,
      result: next,
    };
  }

  if (input.kind === "reject_proposal") {
    const current = await getDappShellState();
    const proposal = current.proposals.find((item) => item.id === input.proposalId);
    const next = await rejectProposal(input.proposalId);

    if (proposal) {
      rejectPendingConnectionApproval(
        proposal.origin.origin,
        input.proposalId,
        "user_rejected",
        "The connection request was rejected in Acorus Wallet.",
      );
    }

    return {
      requestId,
      ok: true,
      result: next,
    };
  }

  if (input.kind === "approve_request") {
    const current = await getDappShellState();
    const request = getPendingDappRequest(current, input.requestIdTarget);
    const next = await approveRequestInQueue(input.requestIdTarget);

    if (request) {
      resolvePendingProviderApproval(request, next.updatedAt);
    }

    return {
      requestId,
      ok: true,
      result: next,
    };
  }

  if (input.kind === "reject_request") {
    const current = await getDappShellState();
    const request = getPendingDappRequest(current, input.requestIdTarget);
    const next = await rejectRequestInQueue(input.requestIdTarget);

    if (request) {
      rejectPendingProviderApproval(
        request.id,
        "user_rejected",
        "The request was rejected in Acorus Wallet.",
      );
    }

    return {
      requestId,
      ok: true,
      result: next,
    };
  }

  if (input.kind === "revoke_session") {
    const current = await getDappShellState();
    const affectedRequests = current.pendingRequests.filter(
      (request) => request.sessionId === input.sessionId,
    );
    const next = await revokeSessionInRegistry(input.sessionId);

    for (const request of affectedRequests) {
      rejectPendingProviderApproval(
        request.id,
        "session_revoked",
        "The active dApp session was revoked before the request completed.",
      );
    }

    return {
      requestId,
      ok: true,
      result: next,
    };
  }

  if (input.kind === "provider_request") {
    if (!isAcorusProviderMethod(input.method)) {
      return {
        requestId,
        ok: false,
        error: {
          code: "unsupported_method",
          message: "The Acorus extension skeleton does not recognize this method.",
        },
      };
    }

    if (input.method === "acorus_ping") {
      const state = await getDappShellState();
      const bridge = createDappBridgeSessionView(state, input.origin);

      return {
        requestId,
        ok: true,
        result: {
          provider: "acorus_extension_preview_bridge",
          connectivity: bridge.status,
          providerMode: bridge.providerMode,
          origin: input.origin,
          accounts: bridge.accounts,
          chainId: bridge.activeChainId,
        },
      };
    }

    return handleProviderMethod(requestId, input.origin, input.method, input.params);
  }

  return {
    requestId,
    ok: false,
    error: {
      code: "unsupported_message_kind",
      message: "Unsupported extension message kind.",
    },
  };
}

async function handleProviderMethod(
  requestId: string,
  origin: string,
  method: AcorusProviderMethod,
  params?: unknown[],
): Promise<ExtensionRuntimeResponse> {
  const state = await getDappShellState();
  const session = getActiveDappSession(state, origin);

  if (method === "acorus_requestAccounts") {
    const vaultStatus = await getExtensionVaultStatus();

    if (vaultStatus.hasVault && !vaultStatus.isUnlocked) {
      await setActivePromptOrigin(origin);
      openApprovalWindow();
      return {
        requestId,
        ok: false,
        error: {
          code: "wallet_locked",
          message: "Unlock Acorus Wallet extension before connecting this site.",
        },
      };
    }

    if (session && hasDappPermission(session, "view_accounts")) {
      const bridge = await touchOriginSession(origin);
      return {
        requestId,
        ok: true,
        result: bridge.accounts,
      };
    }

    const bridge = await ensureOriginConnectionProposal(origin);
    await setActivePromptOrigin(origin);
    openApprovalWindow();
    return waitForConnectionApproval({
      requestId,
      origin,
      proposalId: bridge.proposalId ?? getPendingDappProposal(
        await getDappShellState(),
        origin,
      )?.id ?? null,
    });
  }

  if (method === "acorus_accounts") {
    if (!session || !hasDappPermission(session, "view_accounts")) {
      return {
        requestId,
        ok: true,
        result: [],
      };
    }

    return {
      requestId,
      ok: true,
      result: session.accounts,
    };
  }

  if (method === "acorus_chainId") {
    if (!session || !hasDappPermission(session, "view_chain")) {
      return {
        requestId,
        ok: false,
        error: {
          code: "not_connected",
          message:
            "No approved session is connected for this origin, so the active chain is unavailable.",
        },
      };
    }

    const bridge = await touchOriginSession(origin);
    return {
      requestId,
      ok: true,
      result: bridge.activeChainId,
    };
  }

  if (method === "acorus_switchChain") {
    if (!session) {
      return {
        requestId,
        ok: false,
        error: {
          code: "not_connected",
          message:
            "No approved session is connected for this origin, so chain switching is unavailable.",
        },
      };
    }

    if (!hasDappPermission(session, "switch_chain")) {
      return {
        requestId,
        ok: false,
        error: {
          code: "permission_denied",
          message:
            "This session was not approved for chain switching.",
        },
      };
    }

    const requestedChainId = parseRequestedChainId(params?.[0]);

    if (requestedChainId === null) {
      return {
        requestId,
        ok: false,
        error: {
          code: "bad_request",
          message:
            "acorus_switchChain expects the first parameter to be a string or number chain id.",
        },
      };
    }

    if (!session.chainIds.some((chainId) => String(chainId) === String(requestedChainId))) {
      return {
        requestId,
        ok: false,
        error: {
          code: "unsupported_chain",
          message:
            "This preview-backed session was not approved for the requested chain id.",
        },
      };
    }

    const bridge = await switchOriginSessionChain(origin, requestedChainId);
    return {
      requestId,
      ok: true,
      result: bridge.activeChainId,
    };
  }

  if (isApprovalMethod(method)) {
    if (!session) {
      return {
        requestId,
        ok: false,
        error: {
          code: "not_connected",
          message:
            "No approved session is connected for this origin, so request review cannot begin.",
        },
      };
    }

    const queued = queueDappRequest(state, {
      id: requestId,
      sessionId: session.id,
      kind: getRequestKindForMethod(method),
      origin,
      account: session.accounts[0] ?? null,
      chainId: getDappSessionActiveChainId(session),
      summary: buildApprovalSummary(method, params, session),
      warning:
        "Approval can complete in the extension, but the final signature or broadcast remains preview-only in this wave.",
    });

    if (queued.created) {
      await setDappShellState(queued.snapshot);
    }

    return waitForProviderApproval(queued.request);
  }

  return {
    requestId,
    ok: false,
    error: {
      code: "not_enabled",
      message:
        "This provider method is recognized, but it is not live in the current Acorus bridge wave.",
    },
  };
}

async function resolveActiveOrigin(
  inputOrigin: string | null | undefined,
  sender: chrome.MessageSender,
): Promise<string | null> {
  const senderOrigin = normalizeRuntimeOrigin(sender.origin ?? sender.url ?? null);

  return inputOrigin ?? senderOrigin ?? await getActivePromptOrigin();
}

function normalizeRuntimeOrigin(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol === "chrome-extension:") {
      return null;
    }

    return url.origin;
  } catch {
    return value.startsWith("chrome-extension://") ? null : value;
  }
}

async function setActivePromptOrigin(origin: string): Promise<void> {
  await chrome.storage.local.set({
    [ACTIVE_PROMPT_ORIGIN_KEY]: origin,
  });
}

async function getActivePromptOrigin(): Promise<string | null> {
  const result = await chrome.storage.local.get(ACTIVE_PROMPT_ORIGIN_KEY);
  const value = result[ACTIVE_PROMPT_ORIGIN_KEY];
  return typeof value === "string" ? value : null;
}

function openApprovalWindow(): void {
  try {
    void chrome.windows?.create?.({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 420,
      height: 720,
      focused: true,
    });
  } catch {
    // The request stays pending; the user can open the popup manually.
  }
}

function parseRequestedChainId(value: unknown): ChainId | null {
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }

  return null;
}

function isApprovalMethod(method: AcorusProviderMethod): boolean {
  return (
    method === "acorus_signMessage"
    || method === "acorus_signTypedData"
    || method === "acorus_signTransaction"
    || method === "acorus_sendTransaction"
  );
}

function getRequestKindForMethod(method: AcorusProviderMethod): DappRequestKind {
  switch (method) {
    case "acorus_signMessage":
      return "sign_message";
    case "acorus_signTypedData":
      return "sign_typed_data";
    case "acorus_signTransaction":
      return "sign_transaction";
    case "acorus_sendTransaction":
      return "send_transaction";
    default:
      return "sign_message";
  }
}

function waitForConnectionApproval(input: {
  requestId: string;
  origin: string;
  proposalId: string | null;
}): Promise<ExtensionRuntimeResponse> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      pendingConnectionApprovals.delete(input.requestId);
      resolve({
        requestId: input.requestId,
        ok: false,
        error: {
          code: "user_rejected",
          message: "The Acorus Wallet connection approval timed out.",
        },
      });
    }, 5 * 60 * 1000);

    pendingConnectionApprovals.set(input.requestId, {
      origin: input.origin,
      proposalId: input.proposalId,
      timeoutId,
      resolve,
    });
  });
}

function waitForProviderApproval(
  request: DappRequest,
): Promise<ExtensionRuntimeResponse> {
  return new Promise((resolve) => {
    pendingProviderApprovals.set(request.id, {
      resolve,
    });
  });
}

function resolvePendingConnectionApproval(
  origin: string,
  proposalId: string,
  nextSnapshot: DappShellSnapshot,
): void {
  const bridge = createDappBridgeSessionView(nextSnapshot, origin);

  for (const [requestId, pending] of pendingConnectionApprovals.entries()) {
    if (pending.origin !== origin && pending.proposalId !== proposalId) {
      continue;
    }

    clearTimeout(pending.timeoutId);
    pendingConnectionApprovals.delete(requestId);
    pending.resolve({
      requestId,
      ok: true,
      result: bridge.accounts,
    });
  }
}

function rejectPendingConnectionApproval(
  origin: string,
  proposalId: string,
  code: string,
  message: string,
): void {
  for (const [requestId, pending] of pendingConnectionApprovals.entries()) {
    if (pending.origin !== origin && pending.proposalId !== proposalId) {
      continue;
    }

    clearTimeout(pending.timeoutId);
    pendingConnectionApprovals.delete(requestId);
    pending.resolve({
      requestId,
      ok: false,
      error: {
        code,
        message,
      },
    });
  }
}

function resolvePendingProviderApproval(
  request: DappRequest,
  approvedAt: string,
): void {
  const pending = pendingProviderApprovals.get(request.id);

  if (!pending) {
    return;
  }

  pendingProviderApprovals.delete(request.id);
  pending.resolve({
    requestId: request.id,
    ok: true,
    result: createApprovedPreviewDappResult(request, approvedAt),
  });
}

function rejectPendingProviderApproval(
  requestId: string,
  code: string,
  message: string,
): void {
  const pending = pendingProviderApprovals.get(requestId);

  if (!pending) {
    return;
  }

  pendingProviderApprovals.delete(requestId);
  pending.resolve({
    requestId,
    ok: false,
    error: {
      code,
      message,
    },
  });
}

function buildApprovalSummary(
  method: AcorusProviderMethod,
  params: unknown[] | undefined,
  session: NonNullable<ReturnType<typeof getActiveDappSession>>,
): string {
  const chain = String(getDappSessionActiveChainId(session) ?? "n/a");
  const payload = summarizePayload(params?.[0]);

  switch (method) {
    case "acorus_signMessage":
      return `Sign message review on chain ${chain}. Payload preview: ${payload}.`;
    case "acorus_signTypedData":
      return `Sign typed data review on chain ${chain}. Payload preview: ${payload}.`;
    case "acorus_signTransaction":
      return `Sign transaction review on chain ${chain}. Transaction preview: ${payload}.`;
    case "acorus_sendTransaction":
      return `Send transaction review on chain ${chain}. Broadcast remains preview-only. Payload preview: ${payload}.`;
    default:
      return `Request review on chain ${chain}. Payload preview: ${payload}.`;
  }
}

function summarizePayload(value: unknown): string {
  if (typeof value === "string") {
    return truncate(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value && typeof value === "object") {
    try {
      return truncate(JSON.stringify(value));
    } catch {
      return "object";
    }
  }

  if (value === undefined) {
    return "empty";
  }

  return String(value);
}

function truncate(value: string, length = 96): string {
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

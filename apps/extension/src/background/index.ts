import {
  createApprovedPreviewDappResult,
  createDappBridgeSessionView,
  getActiveDappSession,
  getDappSessionActiveChainId,
  getPendingDappRequest,
  hasDappPermission,
  queueDappRequest,
  type DappRequest,
  type DappRequestKind,
  type ChainId,
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
  approveProposal,
  approveRequestInQueue,
  ensureOriginConnectionProposal,
  getWalletSyncState,
  getDappShellState,
  initializePermissionStore,
  queueWalletConnectPairingProposal,
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
    const activeOrigin =
      input.origin ?? sender.origin ?? sender.url ?? null;
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
      }),
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

  if (input.kind === "approve_proposal") {
    return {
      requestId,
      ok: true,
      result: await approveProposal(input.proposalId),
    };
  }

  if (input.kind === "reject_proposal") {
    return {
      requestId,
      ok: true,
      result: await rejectProposal(input.proposalId),
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
    if (session && hasDappPermission(session, "view_accounts")) {
      const bridge = await touchOriginSession(origin);
      return {
        requestId,
        ok: true,
        result: bridge.accounts,
      };
    }

    await ensureOriginConnectionProposal(origin);
    return {
      requestId,
      ok: false,
      error: {
        code: "approval_required",
        message:
          "Approve the connection request in Acorus Wallet before retrying requestAccounts.",
      },
    };
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

function waitForProviderApproval(
  request: DappRequest,
): Promise<ExtensionRuntimeResponse> {
  return new Promise((resolve) => {
    pendingProviderApprovals.set(request.id, {
      resolve,
    });
  });
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

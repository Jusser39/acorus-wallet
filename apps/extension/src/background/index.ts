import {
  createDappBridgeSessionView,
  getActiveDappSession,
  hasDappPermission,
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
  getDappShellState,
  initializePermissionStore,
  rejectProposal,
  rejectRequestInQueue,
  revokeSessionInRegistry,
  switchOriginSessionChain,
  touchOriginSession,
} from "./permission-store";

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
    const activeOrigin =
      input.origin ?? sender.origin ?? sender.url ?? null;

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
        providerInjection: "preview_bridge",
      }),
    };
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
    return {
      requestId,
      ok: true,
      result: await approveRequestInQueue(input.requestIdTarget),
    };
  }

  if (input.kind === "reject_request") {
    return {
      requestId,
      ok: true,
      result: await rejectRequestInQueue(input.requestIdTarget),
    };
  }

  if (input.kind === "revoke_session") {
    return {
      requestId,
      ok: true,
      result: await revokeSessionInRegistry(input.sessionId),
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

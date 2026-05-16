import {
  createRequestId,
  createSkeletonState,
  isAcorusProviderMethod,
  type ExtensionRuntimeMessage,
  type ExtensionRuntimeResponse,
} from "../shared/protocol";
import {
  approveProposal,
  approveRequestInQueue,
  getDappShellState,
  initializePermissionStore,
  rejectProposal,
  rejectRequestInQueue,
  revokeSessionInRegistry,
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
    return {
      requestId,
      ok: true,
      result: createSkeletonState({
        activeOrigin: input.origin ?? sender.origin ?? sender.url ?? null,
        proposals: state.proposals,
        sessions: state.sessions,
        pendingRequests: state.pendingRequests,
        approvalResults: state.approvalResults,
        lastUpdatedAt: state.updatedAt,
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
      return {
        requestId,
        ok: true,
        result: {
          provider: "acorus_extension_skeleton",
          connectivity: "disabled",
          origin: input.origin,
        },
      };
    }

    return {
      requestId,
      ok: false,
      error: {
        code: "not_enabled",
        message: "Chrome extension skeleton is present, but live account access is disabled.",
      },
    };
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

import {
  createRequestId,
  type BackgroundStateSnapshot,
  type ExtensionRuntimeResponse,
} from "../shared/protocol";

type RuntimeSurface = "popup" | "options";

async function sendUiMessage<T = unknown>(
  message: Record<string, unknown>,
  surface: RuntimeSurface = "popup",
): Promise<T> {
  const response = (await chrome.runtime.sendMessage({
    requestId: createRequestId(`ui_${surface}`),
    surface,
    ...message,
  })) as ExtensionRuntimeResponse | undefined;

  if (!response) {
    throw new Error("Acorus background did not return a response.");
  }

  if (!response.ok) {
    throw new Error(response.error?.message ?? "Acorus extension request failed.");
  }

  return response.result as T;
}

export async function getBackgroundState(): Promise<BackgroundStateSnapshot | null> {
  try {
    return await sendUiMessage<BackgroundStateSnapshot>(
      {
        kind: "get_state",
        // В popup не передаём chrome-extension:// как active dApp origin.
        // Background сам поднимет active prompt origin, если он есть.
        origin: null,
      },
      "popup",
    );
  } catch (error) {
    console.error("Failed to get background state", error);
    return null;
  }
}

export async function getExtensionHome(): Promise<unknown> {
  return sendUiMessage(
    {
      kind: "get_extension_home",
    },
    "popup",
  );
}

export async function createWallet(name: string, passcode: string): Promise<unknown> {
  return sendUiMessage({
    kind: "create_wallet",
    name,
    passcode,
  });
}

export async function importWallet(
  name: string,
  mnemonic: string,
  passcode: string,
): Promise<unknown> {
  return sendUiMessage({
    kind: "import_wallet",
    name,
    mnemonic,
    passcode,
  });
}

export async function unlockWallet(passcode: string): Promise<unknown> {
  return sendUiMessage({
    kind: "unlock_wallet",
    passcode,
  });
}

export async function lockWallet(): Promise<unknown> {
  return sendUiMessage({
    kind: "lock_wallet",
  });
}

export async function resetWallet(): Promise<unknown> {
  return sendUiMessage({
    kind: "reset_extension_wallet",
  });
}

export async function revokeSession(sessionId: string): Promise<unknown> {
  return sendUiMessage({
    kind: "revoke_session",
    sessionId,
  });
}

export async function approveProposal(proposalId: string): Promise<unknown> {
  return sendUiMessage({
    kind: "approve_proposal",
    proposalId,
  });
}

export async function rejectProposal(proposalId: string): Promise<unknown> {
  return sendUiMessage({
    kind: "reject_proposal",
    proposalId,
  });
}

export async function approveRequest(requestIdTarget: string): Promise<unknown> {
  return sendUiMessage({
    kind: "approve_request",
    requestIdTarget,
  });
}

export async function rejectRequest(requestIdTarget: string): Promise<unknown> {
  return sendUiMessage({
    kind: "reject_request",
    requestIdTarget,
  });
}

export async function confirmSignerUnlock(intentId: string): Promise<unknown> {
  return sendUiMessage({
    kind: "confirm_signer_unlock",
    intentId,
  });
}

export async function rejectSignerUnlock(intentId: string): Promise<unknown> {
  return sendUiMessage({
    kind: "reject_signer_unlock",
    intentId,
  });
}

export async function sendInternalTransaction(
  to: string,
  value: string,
  chainId: number,
): Promise<unknown> {
  return sendUiMessage({
    kind: "send_internal_transaction",
    to,
    value,
    chainId,
  });
}

import type {
  DappApprovalResult,
  DappBridgeSessionView,
  DappRequest,
  DappSession,
  DappSessionProposal,
  DappWalletExposure,
  DappWalletSyncEnvelope,
} from "@acorus/shared";

export const ACORUS_INPAGE_REQUEST = "acorus:inpage-request";
export const ACORUS_INPAGE_RESPONSE = "acorus:inpage-response";
export const ACORUS_INPAGE_STATE = "acorus:inpage-state";

export type ExtensionSurface =
  | "background"
  | "content"
  | "inpage"
  | "popup"
  | "options";

export const ACORUS_PROVIDER_METHODS = [
  "acorus_ping",
  "acorus_requestAccounts",
  "acorus_accounts",
  "acorus_chainId",
  "acorus_switchChain",
  "acorus_signMessage",
  "acorus_signTypedData",
  "acorus_signTransaction",
  "acorus_sendTransaction",
] as const;

export type AcorusProviderMethod = (typeof ACORUS_PROVIDER_METHODS)[number];

export type BackgroundStateSnapshot = {
  phase: "permission_shell";
  providerInjection: "stub_only" | "preview_bridge" | "wallet_bridge";
  executionEnabled: false;
  proposals: DappSessionProposal[];
  sessions: DappSession[];
  pendingRequests: DappRequest[];
  approvalResults: DappApprovalResult[];
  activeOriginBridge?: DappBridgeSessionView | null;
  walletExposureMode: "preview_accounts" | "wallet_backed";
  walletExposedAccounts: DappWalletExposure[];
  walletLastSyncedAt?: string | null;
  supportedMethods: readonly AcorusProviderMethod[];
  lastUpdatedAt: string;
  activeOrigin?: string | null;
};

export type ExtensionRuntimeMessage =
  | {
      kind: "ping";
      requestId: string;
      surface: ExtensionSurface;
    }
  | {
      kind: "get_state";
      requestId: string;
      surface: ExtensionSurface;
      origin?: string | null;
    }
  | {
      kind: "provider_request";
      requestId: string;
      surface: "content";
      origin: string;
      method: AcorusProviderMethod;
      params?: unknown[];
    }
  | {
      kind: "approve_proposal";
      requestId: string;
      surface: "popup" | "options";
      proposalId: string;
    }
  | {
      kind: "reject_proposal";
      requestId: string;
      surface: "popup" | "options";
      proposalId: string;
    }
  | {
      kind: "approve_request";
      requestId: string;
      surface: "popup" | "options";
      requestIdTarget: string;
    }
  | {
      kind: "reject_request";
      requestId: string;
      surface: "popup" | "options";
      requestIdTarget: string;
    }
  | {
      kind: "revoke_session";
      requestId: string;
      surface: "popup" | "options";
      sessionId: string;
    }
  | {
      kind: "sync_wallet_profiles";
      requestId: string;
      surface: "content";
      origin: string;
      payload: DappWalletSyncEnvelope;
    }
  | {
      kind: "select_wallet_profile";
      requestId: string;
      surface: "popup" | "options";
      profileId: string;
    }
  | {
      kind: "set_session_account";
      requestId: string;
      surface: "popup" | "options";
      sessionId: string;
      profileId: string;
    }
  | {
      kind: "queue_walletconnect_pairing";
      requestId: string;
      surface: "options";
      uri: string;
      title?: string;
    };

export type ExtensionRuntimeResponse = {
  requestId: string;
  ok: boolean;
  result?: unknown;
  error?: {
    code: string;
    message: string;
  };
};

export type InpageRequestEnvelope = {
  type: typeof ACORUS_INPAGE_REQUEST;
  requestId: string;
  method: AcorusProviderMethod;
  params?: unknown[];
};

export type InpageResponseEnvelope = {
  type: typeof ACORUS_INPAGE_RESPONSE;
  requestId: string;
  ok: boolean;
  result?: unknown;
  error?: {
    code: string;
    message: string;
  };
};

export type InpageStateEnvelope = {
  type: typeof ACORUS_INPAGE_STATE;
  state: DappBridgeSessionView;
};

export const EXTENSION_PHASES = [
  "Manifest V3 shell",
  "Background message router",
  "Content-to-inpage bridge",
  "Live preview provider bridge",
  "Popup and options shells",
  "Permission store types",
  "Connected sites UX",
  "Permission queue shell",
  "EVM compatibility",
  "Universal account controls",
  "WalletConnect pairing shell",
] as const;

export function createRequestId(prefix = "acorus"): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function isAcorusProviderMethod(
  value: string,
): value is AcorusProviderMethod {
  return (ACORUS_PROVIDER_METHODS as readonly string[]).includes(value);
}

export function createSkeletonState(input?: {
  activeOrigin?: string | null;
  proposals?: DappSessionProposal[];
  sessions?: DappSession[];
  pendingRequests?: DappRequest[];
  approvalResults?: DappApprovalResult[];
  activeOriginBridge?: DappBridgeSessionView | null;
  lastUpdatedAt?: string;
  providerInjection?: BackgroundStateSnapshot["providerInjection"];
  walletExposureMode?: BackgroundStateSnapshot["walletExposureMode"];
  walletExposedAccounts?: BackgroundStateSnapshot["walletExposedAccounts"];
  walletLastSyncedAt?: string | null;
}): BackgroundStateSnapshot {
  return {
    phase: "permission_shell",
    providerInjection: input?.providerInjection ?? "stub_only",
    executionEnabled: false,
    proposals: input?.proposals ?? [],
    sessions: input?.sessions ?? [],
    pendingRequests: input?.pendingRequests ?? [],
    approvalResults: input?.approvalResults ?? [],
    activeOriginBridge: input?.activeOriginBridge ?? null,
    walletExposureMode: input?.walletExposureMode ?? "preview_accounts",
    walletExposedAccounts: input?.walletExposedAccounts ?? [],
    walletLastSyncedAt: input?.walletLastSyncedAt ?? null,
    supportedMethods: ACORUS_PROVIDER_METHODS,
    lastUpdatedAt: input?.lastUpdatedAt ?? new Date().toISOString(),
    activeOrigin: input?.activeOrigin ?? null,
  };
}

export function isInpageRequestEnvelope(
  value: unknown,
): value is InpageRequestEnvelope {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<InpageRequestEnvelope>;
  return (
    candidate.type === ACORUS_INPAGE_REQUEST
    && typeof candidate.requestId === "string"
    && typeof candidate.method === "string"
    && isAcorusProviderMethod(candidate.method)
  );
}

export function isInpageStateEnvelope(
  value: unknown,
): value is InpageStateEnvelope {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<InpageStateEnvelope>;
  return (
    candidate.type === ACORUS_INPAGE_STATE
    && typeof candidate.state === "object"
    && candidate.state !== null
    && typeof (candidate.state as Partial<DappBridgeSessionView>).origin === "string"
  );
}

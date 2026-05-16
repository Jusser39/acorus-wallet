import type {
  DappApprovalResult,
  DappRequest,
  DappSession,
  DappSessionProposal,
} from "@acorus/shared";

export const ACORUS_INPAGE_REQUEST = "acorus:inpage-request";
export const ACORUS_INPAGE_RESPONSE = "acorus:inpage-response";

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
] as const;

export type AcorusProviderMethod = (typeof ACORUS_PROVIDER_METHODS)[number];

export type BackgroundStateSnapshot = {
  phase: "permission_shell";
  providerInjection: "stub_only";
  executionEnabled: false;
  proposals: DappSessionProposal[];
  sessions: DappSession[];
  pendingRequests: DappRequest[];
  approvalResults: DappApprovalResult[];
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

export const EXTENSION_PHASES = [
  "Manifest V3 shell",
  "Background message router",
  "Content-to-inpage bridge",
  "Stub provider exposure",
  "Popup and options shells",
  "Permission store types",
  "Connected sites UX later",
  "Permission queue shell",
  "EVM compatibility later",
  "Solana compatibility later",
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
  lastUpdatedAt?: string;
}): BackgroundStateSnapshot {
  return {
    phase: "permission_shell",
    providerInjection: "stub_only",
    executionEnabled: false,
    proposals: input?.proposals ?? [],
    sessions: input?.sessions ?? [],
    pendingRequests: input?.pendingRequests ?? [],
    approvalResults: input?.approvalResults ?? [],
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

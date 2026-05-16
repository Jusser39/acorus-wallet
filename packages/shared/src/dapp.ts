import type { ChainId } from "./multichain";

export type DappRequestKind =
  | "connect"
  | "sign_message"
  | "sign_typed_data"
  | "sign_transaction"
  | "send_transaction";

export type DappPermissionScope =
  | "view_accounts"
  | "view_chain"
  | "switch_chain"
  | "sign_message"
  | "sign_typed_data"
  | "sign_transaction"
  | "send_transaction";

export type DappTrustLevel = "unknown" | "trusted" | "warning";

export type DappProposalStatus = "pending" | "rejected";

export type DappSessionStatus = "active" | "revoked" | "expired";

export type DappRequestStatus = "pending" | "approved" | "rejected";

export type DappApprovalDecision = "approved" | "rejected";

export type DappOriginMetadata = {
  origin: string;
  title: string;
  iconUrl?: string | null;
  description?: string | null;
  trustLevel: DappTrustLevel;
};

export type DappPermission = {
  id: DappPermissionScope;
  label: string;
  description: string;
};

export type DappSessionProposal = {
  id: string;
  origin: DappOriginMetadata;
  requestedAccounts: string[];
  requestedChainIds: ChainId[];
  requestedPermissions: DappPermissionScope[];
  status: DappProposalStatus;
  warning?: string | null;
  createdAt: string;
};

export type DappSession = {
  id: string;
  origin: DappOriginMetadata;
  accounts: string[];
  chainIds: ChainId[];
  permissions: DappPermissionScope[];
  status: DappSessionStatus;
  connectedAt: string;
  lastUsedAt?: string | null;
  warning?: string | null;
};

export type DappRequest = {
  id: string;
  sessionId?: string | null;
  kind: DappRequestKind;
  origin: DappOriginMetadata;
  account?: string | null;
  chainId?: ChainId | null;
  requestedPermissions: DappPermissionScope[];
  summary: string;
  status: DappRequestStatus;
  createdAt: string;
  warning?: string | null;
};

export type DappApprovalResult = {
  id: string;
  targetKind: "proposal" | "request" | "session";
  targetId: string;
  decision: DappApprovalDecision;
  decidedAt: string;
  reason?: string | null;
};

export type DappShellSnapshot = {
  proposals: DappSessionProposal[];
  sessions: DappSession[];
  pendingRequests: DappRequest[];
  approvalResults: DappApprovalResult[];
  updatedAt: string;
};

export const DAPP_PERMISSION_DEFINITIONS: DappPermission[] = [
  {
    id: "view_accounts",
    label: "View accounts",
    description: "Allow the site to see selected wallet addresses.",
  },
  {
    id: "view_chain",
    label: "View active chain",
    description: "Allow the site to read the currently selected network.",
  },
  {
    id: "switch_chain",
    label: "Switch chain",
    description: "Allow the site to request a network switch prompt.",
  },
  {
    id: "sign_message",
    label: "Sign messages",
    description: "Allow the site to request personal message signatures later.",
  },
  {
    id: "sign_typed_data",
    label: "Sign typed data",
    description: "Allow the site to request typed data signatures later.",
  },
  {
    id: "sign_transaction",
    label: "Sign transactions",
    description: "Allow the site to request transaction signatures later.",
  },
  {
    id: "send_transaction",
    label: "Send transactions",
    description: "Allow the site to request transaction broadcasts later.",
  },
];

const DEMO_TIMESTAMPS = {
  proposal: "2026-05-16T12:00:00.000Z",
  session: "2026-05-16T12:05:00.000Z",
  request: "2026-05-16T12:10:00.000Z",
  approval: "2026-05-16T12:12:00.000Z",
} as const;

export function getDappPermissionDefinition(
  permission: DappPermissionScope,
): DappPermission {
  return (
    DAPP_PERMISSION_DEFINITIONS.find((item) => item.id === permission)
    ?? {
      id: permission,
      label: permission,
      description: permission,
    }
  );
}

export function getDappRequestKindLabel(kind: DappRequestKind): string {
  switch (kind) {
    case "connect":
      return "Connect";
    case "sign_message":
      return "Sign message";
    case "sign_typed_data":
      return "Sign typed data";
    case "sign_transaction":
      return "Sign transaction";
    case "send_transaction":
      return "Send transaction";
    default:
      return kind;
  }
}

export function getDappSessionStatusLabel(status: DappSessionStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "revoked":
      return "Revoked";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

export function getDappRequestStatusLabel(status: DappRequestStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

export function createDemoDappShellSnapshot(): DappShellSnapshot {
  const swapOrigin: DappOriginMetadata = {
    origin: "https://swap.demo.acorus.app",
    title: "Acorus Demo Swap",
    description: "Preview-only swap dApp shell for permission UX.",
    trustLevel: "trusted",
  };
  const questsOrigin: DappOriginMetadata = {
    origin: "https://quests.demo.acorus.app",
    title: "Acorus Demo Quests",
    description: "Gamified onboarding dApp preview shell.",
    trustLevel: "warning",
  };

  return {
    proposals: [
      {
        id: "proposal_demo_quests_connect",
        origin: questsOrigin,
        requestedAccounts: ["0x123400000000000000000000000000000000abcd"],
        requestedChainIds: [1, 101],
        requestedPermissions: ["view_accounts", "view_chain"],
        status: "pending",
        warning:
          "Preview proposal only. No real site connectivity or account access is enabled in this wave.",
        createdAt: DEMO_TIMESTAMPS.proposal,
      },
    ],
    sessions: [
      {
        id: "session_demo_swap",
        origin: swapOrigin,
        accounts: ["0x123400000000000000000000000000000000abcd"],
        chainIds: [1],
        permissions: ["view_accounts", "view_chain", "switch_chain"],
        status: "active",
        connectedAt: DEMO_TIMESTAMPS.session,
        lastUsedAt: DEMO_TIMESTAMPS.request,
        warning:
          "Preview session only. Signing and send requests remain disabled until a later wave.",
      },
    ],
    pendingRequests: [
      {
        id: "request_demo_swap_sign_message",
        sessionId: "session_demo_swap",
        kind: "sign_message",
        origin: swapOrigin,
        account: "0x123400000000000000000000000000000000abcd",
        chainId: 1,
        requestedPermissions: ["sign_message"],
        summary:
          "Request to sign a login challenge. This remains preview-only in the current shell.",
        status: "pending",
        createdAt: DEMO_TIMESTAMPS.request,
        warning:
          "Preview request only. No signature will be produced in this wave.",
      },
    ],
    approvalResults: [],
    updatedAt: DEMO_TIMESTAMPS.request,
  };
}

export function approveDappProposal(
  snapshot: DappShellSnapshot,
  proposalId: string,
): DappShellSnapshot {
  const proposal = snapshot.proposals.find((item) => item.id === proposalId);

  if (!proposal) {
    return snapshot;
  }

  const nextSession: DappSession = {
    id: `session_${proposal.id}`,
    origin: proposal.origin,
    accounts: proposal.requestedAccounts,
    chainIds: proposal.requestedChainIds,
    permissions: proposal.requestedPermissions,
    status: "active",
    connectedAt: snapshot.updatedAt,
    lastUsedAt: null,
    warning:
      "Approved in preview mode only. Live connectivity remains disabled until a later wave.",
  };

  return {
    proposals: snapshot.proposals.filter((item) => item.id !== proposalId),
    sessions: [nextSession, ...snapshot.sessions],
    pendingRequests: snapshot.pendingRequests,
    approvalResults: [
      createApprovalResult({
        targetKind: "proposal",
        targetId: proposalId,
        decision: "approved",
      }),
      ...snapshot.approvalResults,
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function rejectDappProposal(
  snapshot: DappShellSnapshot,
  proposalId: string,
  reason?: string | null,
): DappShellSnapshot {
  if (!snapshot.proposals.some((item) => item.id === proposalId)) {
    return snapshot;
  }

  return {
    proposals: snapshot.proposals.filter((item) => item.id !== proposalId),
    sessions: snapshot.sessions,
    pendingRequests: snapshot.pendingRequests,
    approvalResults: [
      createApprovalResult({
        targetKind: "proposal",
        targetId: proposalId,
        decision: "rejected",
        reason: reason ?? "Rejected in preview shell.",
      }),
      ...snapshot.approvalResults,
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function approveDappRequest(
  snapshot: DappShellSnapshot,
  requestId: string,
): DappShellSnapshot {
  const request = snapshot.pendingRequests.find((item) => item.id === requestId);

  if (!request) {
    return snapshot;
  }

  return {
    proposals: snapshot.proposals,
    sessions: snapshot.sessions.map((session) =>
      session.id === request.sessionId
        ? {
            ...session,
            lastUsedAt: new Date().toISOString(),
          }
        : session,
    ),
    pendingRequests: snapshot.pendingRequests.filter((item) => item.id !== requestId),
    approvalResults: [
      createApprovalResult({
        targetKind: "request",
        targetId: requestId,
        decision: "approved",
      }),
      ...snapshot.approvalResults,
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function rejectDappRequest(
  snapshot: DappShellSnapshot,
  requestId: string,
  reason?: string | null,
): DappShellSnapshot {
  if (!snapshot.pendingRequests.some((item) => item.id === requestId)) {
    return snapshot;
  }

  return {
    proposals: snapshot.proposals,
    sessions: snapshot.sessions,
    pendingRequests: snapshot.pendingRequests.filter((item) => item.id !== requestId),
    approvalResults: [
      createApprovalResult({
        targetKind: "request",
        targetId: requestId,
        decision: "rejected",
        reason: reason ?? "Rejected in preview shell.",
      }),
      ...snapshot.approvalResults,
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function revokeDappSession(
  snapshot: DappShellSnapshot,
  sessionId: string,
): DappShellSnapshot {
  if (!snapshot.sessions.some((item) => item.id === sessionId)) {
    return snapshot;
  }

  return {
    proposals: snapshot.proposals,
    sessions: snapshot.sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            status: "revoked",
          }
        : session,
    ),
    pendingRequests: snapshot.pendingRequests.filter(
      (request) => request.sessionId !== sessionId,
    ),
    approvalResults: [
      createApprovalResult({
        targetKind: "session",
        targetId: sessionId,
        decision: "rejected",
        reason: "Session revoked in preview shell.",
      }),
      ...snapshot.approvalResults,
    ],
    updatedAt: new Date().toISOString(),
  };
}

function createApprovalResult(input: {
  targetKind: DappApprovalResult["targetKind"];
  targetId: string;
  decision: DappApprovalDecision;
  reason?: string | null;
}): DappApprovalResult {
  return {
    id: `approval_${input.targetKind}_${input.targetId}_${Date.now()}`,
    targetKind: input.targetKind,
    targetId: input.targetId,
    decision: input.decision,
    decidedAt: new Date().toISOString(),
    reason: input.reason ?? null,
  };
}

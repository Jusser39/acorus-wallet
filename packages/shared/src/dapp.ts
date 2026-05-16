import type { ChainFamily, ChainId } from "./multichain";
import type { WalletProfileType } from "./types";

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

export type DappProviderExposureMode =
  | "stub_only"
  | "preview_accounts"
  | "wallet_backed";

export type DappBridgeConnectionStatus =
  | "disconnected"
  | "approval_required"
  | "connected";

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
  providerMode: DappProviderExposureMode;
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
  providerMode: DappProviderExposureMode;
  accounts: string[];
  chainIds: ChainId[];
  activeChainId?: ChainId | null;
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

export type DappBridgeSessionView = {
  origin: string;
  status: DappBridgeConnectionStatus;
  providerMode: DappProviderExposureMode;
  sessionId?: string | null;
  proposalId?: string | null;
  accounts: string[];
  chainIds: ChainId[];
  activeChainId?: ChainId | null;
  permissions: DappPermissionScope[];
  warning?: string | null;
  updatedAt: string;
};

export type DappWalletSyncProfile = {
  id: string;
  name: string;
  type: WalletProfileType;
  publicAddress: string;
  chainFamily: ChainFamily;
};

export type DappWalletExposure = {
  profileId: string;
  name: string;
  account: string;
  chainFamily: ChainFamily;
  chainIds: ChainId[];
  selected: boolean;
};

export const ACORUS_EXTENSION_WALLET_SYNC = "acorus:wallet-sync";

export type DappWalletSyncEnvelope = {
  type: typeof ACORUS_EXTENSION_WALLET_SYNC;
  source: "acorus_wallet_web";
  activeProfileId?: string | null;
  profiles: DappWalletSyncProfile[];
  syncedAt: string;
};

export type EnsureDappConnectionProposalInput = {
  origin: string;
  providerMode?: DappProviderExposureMode;
  requestedAccounts?: string[];
  requestedChainIds?: ChainId[];
  requestedPermissions?: DappPermissionScope[];
  title?: string;
  description?: string | null;
  trustLevel?: DappTrustLevel;
  warning?: string | null;
};

export type EnsureDappConnectionProposalResult = {
  snapshot: DappShellSnapshot;
  proposal: DappSessionProposal;
  created: boolean;
};

export type QueueDappRequestInput = {
  id: string;
  sessionId: string;
  kind: DappRequestKind;
  origin: string;
  account?: string | null;
  chainId?: ChainId | null;
  requestedPermissions?: DappPermissionScope[];
  summary: string;
  warning?: string | null;
};

export type QueueDappRequestResult = {
  snapshot: DappShellSnapshot;
  request: DappRequest;
  created: boolean;
};

export type DappProviderApprovalPreview = {
  requestId: string;
  kind: DappRequestKind;
  status: "approved_preview";
  account?: string | null;
  chainId?: ChainId | null;
  summary: string;
  warning: string;
  approvedAt: string;
  signature: null;
  transactionHash: null;
};

export const PREVIEW_DAPP_BRIDGE_ACCOUNT =
  "0x123400000000000000000000000000000000abcd";

export const PREVIEW_DAPP_BRIDGE_CHAIN_IDS: ChainId[] = [1, 137, 8453];

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

export function isDappWalletSyncEnvelope(
  value: unknown,
): value is DappWalletSyncEnvelope {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<DappWalletSyncEnvelope>;
  return (
    candidate.type === ACORUS_EXTENSION_WALLET_SYNC
    && candidate.source === "acorus_wallet_web"
    && typeof candidate.syncedAt === "string"
    && Array.isArray(candidate.profiles)
    && candidate.profiles.every((profile) =>
      typeof profile?.id === "string"
      && typeof profile?.name === "string"
      && typeof profile?.type === "string"
      && typeof profile?.publicAddress === "string"
      && typeof profile?.chainFamily === "string",
    )
  );
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
    description: "Preview-backed swap dApp shell for permission UX.",
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
        providerMode: "preview_accounts",
        requestedAccounts: [PREVIEW_DAPP_BRIDGE_ACCOUNT],
        requestedChainIds: [1, 137],
        requestedPermissions: ["view_accounts", "view_chain"],
        status: "pending",
        warning:
          "Preview proposal only. A live page-to-extension bridge can queue approvals, but wallet-backed accounts are still disabled.",
        createdAt: DEMO_TIMESTAMPS.proposal,
      },
    ],
    sessions: [
      {
        id: "session_demo_swap",
        origin: swapOrigin,
        providerMode: "preview_accounts",
        accounts: [PREVIEW_DAPP_BRIDGE_ACCOUNT],
        chainIds: [1, 137, 8453],
        activeChainId: 1,
        permissions: ["view_accounts", "view_chain", "switch_chain"],
        status: "active",
        connectedAt: DEMO_TIMESTAMPS.session,
        lastUsedAt: DEMO_TIMESTAMPS.request,
        warning:
          "Bridge connectivity and approval review are live in preview-backed mode only. Real signing output and broadcast remain disabled until a later execution wave.",
      },
    ],
    pendingRequests: [
      {
        id: "request_demo_swap_sign_message",
        sessionId: "session_demo_swap",
        kind: "sign_message",
        origin: swapOrigin,
        account: PREVIEW_DAPP_BRIDGE_ACCOUNT,
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

export function hasDappPermission(
  session: DappSession,
  permission: DappPermissionScope,
): boolean {
  return session.permissions.includes(permission);
}

export function getDappSessionActiveChainId(
  session: DappSession,
): ChainId | null {
  return session.activeChainId ?? session.chainIds[0] ?? null;
}

export function getActiveDappSession(
  snapshot: DappShellSnapshot,
  origin: string,
): DappSession | null {
  return (
    snapshot.sessions.find(
      (session) =>
        session.origin.origin === origin && session.status === "active",
    ) ?? null
  );
}

export function getPendingDappProposal(
  snapshot: DappShellSnapshot,
  origin: string,
): DappSessionProposal | null {
  return (
    snapshot.proposals.find(
      (proposal) =>
        proposal.origin.origin === origin && proposal.status === "pending",
    ) ?? null
  );
}

export function getPendingDappRequest(
  snapshot: DappShellSnapshot,
  requestId: string,
): DappRequest | null {
  return snapshot.pendingRequests.find((item) => item.id === requestId) ?? null;
}

export function getDappRequestPermissionScope(
  kind: DappRequestKind,
): DappPermissionScope {
  switch (kind) {
    case "sign_message":
      return "sign_message";
    case "sign_typed_data":
      return "sign_typed_data";
    case "sign_transaction":
      return "sign_transaction";
    case "send_transaction":
      return "send_transaction";
    case "connect":
    default:
      return "view_accounts";
  }
}

export function createDappOriginMetadata(input: {
  origin: string;
  title?: string;
  description?: string | null;
  trustLevel?: DappTrustLevel;
}): DappOriginMetadata {
  const fallbackTitle = getHostnameLabel(input.origin);

  return {
    origin: input.origin,
    title: input.title ?? fallbackTitle,
    description:
      input.description
      ?? "Live extension bridge request in preview-backed mode.",
    trustLevel: input.trustLevel ?? "unknown",
  };
}

export function ensureDappConnectionProposal(
  snapshot: DappShellSnapshot,
  input: EnsureDappConnectionProposalInput,
): EnsureDappConnectionProposalResult {
  const existing = getPendingDappProposal(snapshot, input.origin);

  if (existing) {
    return {
      snapshot,
      proposal: existing,
      created: false,
    };
  }

  const createdAt = new Date().toISOString();
  const providerMode = input.providerMode ?? "preview_accounts";
  const requestedAccounts = [...new Set(input.requestedAccounts ?? [PREVIEW_DAPP_BRIDGE_ACCOUNT])];
  const requestedChainIds = [...new Set(input.requestedChainIds ?? PREVIEW_DAPP_BRIDGE_CHAIN_IDS)];
  const requestedPermissions: DappPermissionScope[] = [
    ...new Set<DappPermissionScope>(
      input.requestedPermissions ?? [
        "view_accounts",
        "view_chain",
        "switch_chain",
      ],
    ),
  ];
  const proposal: DappSessionProposal = {
    id: `proposal_${sanitizeOrigin(input.origin)}_${Date.now()}`,
    origin: createDappOriginMetadata({
      origin: input.origin,
      title: input.title,
      description: input.description,
      trustLevel: input.trustLevel,
    }),
    providerMode,
    requestedAccounts,
    requestedChainIds,
    requestedPermissions,
    status: "pending",
    warning:
      input.warning
      ?? (
        providerMode === "wallet_backed"
          ? "The page-to-extension bridge is live, and the approved account now comes from the selected synced local Acorus wallet profile. Signing output and broadcast still remain disabled."
          : "The page-to-extension bridge is live, and request approval review can continue after connect. Approved accounts still remain preview-backed until wallet profile integration ships."
      ),
    createdAt,
  };

  return {
    snapshot: {
      ...snapshot,
      proposals: [proposal, ...snapshot.proposals],
      updatedAt: createdAt,
    },
    proposal,
    created: true,
  };
}

export function queueDappRequest(
  snapshot: DappShellSnapshot,
  input: QueueDappRequestInput,
): QueueDappRequestResult {
  const existing = getPendingDappRequest(snapshot, input.id);

  if (existing) {
    return {
      snapshot,
      request: existing,
      created: false,
    };
  }

  const session = snapshot.sessions.find((item) => item.id === input.sessionId);
  const createdAt = new Date().toISOString();
  const request: DappRequest = {
    id: input.id,
    sessionId: input.sessionId,
    kind: input.kind,
    origin: session?.origin ?? createDappOriginMetadata({ origin: input.origin }),
    account: input.account ?? null,
    chainId: input.chainId ?? null,
    requestedPermissions:
      input.requestedPermissions ?? [getDappRequestPermissionScope(input.kind)],
    summary: input.summary,
    status: "pending",
    createdAt,
    warning:
      input.warning
      ?? "Approval review is live, but the final signature or broadcast remains preview-only in this wave.",
  };

  return {
    snapshot: {
      ...snapshot,
      pendingRequests: [request, ...snapshot.pendingRequests],
      updatedAt: createdAt,
    },
    request,
    created: true,
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

  const decidedAt = new Date().toISOString();
  const nextSession: DappSession = {
    id: `session_${proposal.id}`,
    origin: proposal.origin,
    providerMode: proposal.providerMode,
    accounts: proposal.requestedAccounts,
    chainIds: proposal.requestedChainIds,
    activeChainId: proposal.requestedChainIds[0] ?? null,
    permissions: proposal.requestedPermissions,
    status: "active",
    connectedAt: decidedAt,
    lastUsedAt: null,
    warning:
      proposal.providerMode === "wallet_backed"
        ? "Approved in wallet-backed bridge mode. The site can now see the selected synced local Acorus account after approval, while real signing output and send execution remain disabled."
        : "Approved in preview-backed bridge mode only. Request review can continue after connect, but wallet-backed account exposure, real signing, and send execution remain disabled.",
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
        decidedAt,
      }),
      ...snapshot.approvalResults,
    ],
    updatedAt: decidedAt,
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

  const decidedAt = new Date().toISOString();
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
        decidedAt,
      }),
      ...snapshot.approvalResults,
    ],
    updatedAt: decidedAt,
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

  const decidedAt = new Date().toISOString();
  return {
    proposals: snapshot.proposals,
    sessions: snapshot.sessions.map((session) =>
      session.id === request.sessionId
        ? {
            ...session,
            lastUsedAt: decidedAt,
          }
        : session,
    ),
    pendingRequests: snapshot.pendingRequests.filter((item) => item.id !== requestId),
    approvalResults: [
      createApprovalResult({
        targetKind: "request",
        targetId: requestId,
        decision: "approved",
        decidedAt,
      }),
      ...snapshot.approvalResults,
    ],
    updatedAt: decidedAt,
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

  const decidedAt = new Date().toISOString();
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
        decidedAt,
      }),
      ...snapshot.approvalResults,
    ],
    updatedAt: decidedAt,
  };
}

export function revokeDappSession(
  snapshot: DappShellSnapshot,
  sessionId: string,
): DappShellSnapshot {
  if (!snapshot.sessions.some((item) => item.id === sessionId)) {
    return snapshot;
  }

  const decidedAt = new Date().toISOString();
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
        decidedAt,
      }),
      ...snapshot.approvalResults,
    ],
    updatedAt: decidedAt,
  };
}

export function touchDappSession(
  snapshot: DappShellSnapshot,
  sessionId: string,
): DappShellSnapshot {
  if (!snapshot.sessions.some((item) => item.id === sessionId)) {
    return snapshot;
  }

  const touchedAt = new Date().toISOString();
  return {
    ...snapshot,
    sessions: snapshot.sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            lastUsedAt: touchedAt,
          }
        : session,
    ),
    updatedAt: touchedAt,
  };
}

export function setDappSessionActiveChain(
  snapshot: DappShellSnapshot,
  sessionId: string,
  chainId: ChainId,
): DappShellSnapshot {
  if (!snapshot.sessions.some((item) => item.id === sessionId)) {
    return snapshot;
  }

  const updatedAt = new Date().toISOString();
  return {
    ...snapshot,
    sessions: snapshot.sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            activeChainId: chainId,
            lastUsedAt: updatedAt,
          }
        : session,
    ),
    updatedAt,
  };
}

export function createDappBridgeSessionView(
  snapshot: DappShellSnapshot,
  origin: string,
): DappBridgeSessionView {
  const activeSession = getActiveDappSession(snapshot, origin);

  if (activeSession) {
    return {
      origin,
      status: "connected",
      providerMode: activeSession.providerMode,
      sessionId: activeSession.id,
      proposalId: null,
      accounts: activeSession.accounts,
      chainIds: activeSession.chainIds,
      activeChainId: getDappSessionActiveChainId(activeSession),
      permissions: activeSession.permissions,
      warning:
        activeSession.warning
        ?? (
          activeSession.providerMode === "wallet_backed"
            ? "Session is connected through the live extension bridge using the selected synced local Acorus wallet account."
            : "Session is connected through the live extension bridge in preview-backed mode."
        ),
      updatedAt: snapshot.updatedAt,
    };
  }

  const pendingProposal = getPendingDappProposal(snapshot, origin);

  if (pendingProposal) {
    return {
      origin,
      status: "approval_required",
      providerMode: pendingProposal.providerMode,
      sessionId: null,
      proposalId: pendingProposal.id,
      accounts: pendingProposal.requestedAccounts,
      chainIds: pendingProposal.requestedChainIds,
      activeChainId: pendingProposal.requestedChainIds[0] ?? null,
      permissions: pendingProposal.requestedPermissions,
      warning:
        pendingProposal.warning
        ?? (
          pendingProposal.providerMode === "wallet_backed"
            ? "Approval is required before the live bridge exposes the selected synced local Acorus wallet account."
            : "Approval is required before the live bridge exposes preview-backed accounts."
        ),
      updatedAt: snapshot.updatedAt,
    };
  }

  return {
    origin,
    status: "disconnected",
    providerMode: "stub_only",
    sessionId: null,
    proposalId: null,
    accounts: [],
    chainIds: [],
    activeChainId: null,
    permissions: [],
    warning:
      "No live session exists for this origin yet. The site must request approval first.",
    updatedAt: snapshot.updatedAt,
  };
}

export function createApprovedPreviewDappResult(
  request: DappRequest,
  approvedAt: string,
): DappProviderApprovalPreview {
  return {
    requestId: request.id,
    kind: request.kind,
    status: "approved_preview",
    account: request.account ?? null,
    chainId: request.chainId ?? null,
    summary: request.summary,
    warning:
      request.warning
      ?? "Approved in preview mode only. No real signature or broadcast was produced.",
    approvedAt,
    signature: null,
    transactionHash: null,
  };
}

function createApprovalResult(input: {
  targetKind: DappApprovalResult["targetKind"];
  targetId: string;
  decision: DappApprovalDecision;
  reason?: string | null;
  decidedAt: string;
}): DappApprovalResult {
  return {
    id: `approval_${input.targetKind}_${input.targetId}_${Date.now()}`,
    targetKind: input.targetKind,
    targetId: input.targetId,
    decision: input.decision,
    decidedAt: input.decidedAt,
    reason: input.reason ?? null,
  };
}

function getHostnameLabel(origin: string): string {
  try {
    const url = new URL(origin);
    const host = url.hostname.replace(/^www\./, "");
    if (!host) {
      return "Unknown dApp";
    }

    return host
      .split(".")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  } catch {
    return "Unknown dApp";
  }
}

function sanitizeOrigin(origin: string): string {
  return origin.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

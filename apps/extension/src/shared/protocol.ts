import type {
  EncryptedVaultV1,
} from "@acorus/wallet-core";
import type {
  DappApprovalResult,
  DappBridgeSessionView,
  DappRequest,
  DappSession,
  DappSessionProposal,
  EvmSwapQuoteResponse,
  RangoSwapQuoteResponse,
  SolanaSwapQuoteResponse,
  SolanaSwapTransactionDraftResponse,
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
  "acorus_getVaultStatus",
  "acorus_createWallet",
  "acorus_importWallet",
  "acorus_unlockWallet",
  "acorus_lockWallet",
  "acorus_receiveAddress",
  "acorus_requestAccounts",
  "acorus_accounts",
  "acorus_chainId",
  "acorus_switchChain",
  "acorus_getPermissions",
  "acorus_requestPermissions",
  "acorus_revokePermissions",
  "acorus_addChain",
  "acorus_watchAsset",
  "acorus_multichainSend",
  "acorus_swap",
  "acorus_signMessage",
  "acorus_signTypedData",
  "acorus_signTransaction",
  "acorus_sendTransaction",
] as const;

export type AcorusProviderMethod = (typeof ACORUS_PROVIDER_METHODS)[number];

export type BackgroundStateSnapshot = {
  phase: "permission_shell";
  providerInjection: "stub_only" | "preview_bridge" | "wallet_bridge";
  executionEnabled: boolean;
  proposals: DappSessionProposal[];
  sessions: DappSession[];
  pendingRequests: DappRequest[];
  approvalResults: DappApprovalResult[];
  activityLog: ExtensionActivityRecord[];
  signerUnlockQueue: SignerUnlockIntent[];
  activeOriginBridge?: DappBridgeSessionView | null;
  walletExposureMode: "preview_accounts" | "wallet_backed";
  walletExposedAccounts: DappWalletExposure[];
  walletLastSyncedAt?: string | null;
  extensionVaultStatus: ExtensionVaultStatus;
  supportedMethods: readonly AcorusProviderMethod[];
  lastUpdatedAt: string;
  activeOrigin?: string | null;
};

export type ExtensionVaultStatus = {
  hasVault: boolean;
  isUnlocked: boolean;
  activeProfileId: string | null;
  profiles: DappWalletExposure[];
  unlockedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type SignerUnlockIntent = {
  id: string;
  requestId: string;
  kind: DappRequest["kind"];
  origin: string;
  summary: string;
  warning?: string | null;
  account?: string | null;
  chainId?: string | number | null;
  createdAt: string;
};

export type ExtensionActivityRecord = {
  id: string;
  kind:
    | "approval_requested"
    | "approval_submitted"
    | "approval_rejected"
    | "approval_failed"
    | "swap_requested"
    | "swap_submitted"
    | "swap_rejected"
    | "swap_failed";
  provider: "0x" | "jupiter" | "rango";
  chainId: number | string;
  account: string;
  tokenSymbol?: string | null;
  sellTokenSymbol?: string | null;
  buyTokenSymbol?: string | null;
  amountFormatted?: string | null;
  buyAmountFormatted?: string | null;
  approvalMode?: "exact" | "infinite" | null;
  txHash?: string | null;
  status: "queued" | "submitted" | "rejected" | "failed";
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
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
      kind: "get_extension_home";
      requestId: string;
      surface: "popup" | "options";
    }
  | {
      kind: "set_active_extension_chain";
      requestId: string;
      surface: "popup" | "options";
      chainId: string | number;
    }
  | {
      kind: "add_custom_evm_chain";
      requestId: string;
      surface: "popup" | "options" | "content";
      chain: {
        chainId: number;
        chainName: string;
        nativeCurrency: {
          name: string;
          symbol: string;
          decimals: number;
        };
        rpcUrls: string[];
        blockExplorerUrls?: string[];
        iconUrls?: string[];
      };
    }
  | {
      kind: "watch_asset";
      requestId: string;
      surface: "popup" | "options" | "content";
      asset: {
        family: "evm" | "solana" | "tron" | "utxo" | "ton";
        chainId: string | number;
        type: "native" | "erc20" | "spl" | "trc20" | "utxo" | "jetton" | "unknown";
        symbol: string;
        name: string;
        decimals: number;
        tokenAddress?: string | null;
        logoUrl?: string | null;
        isVerified?: boolean;
      };
    }
  | {
      kind: "hide_asset";
      requestId: string;
      surface: "popup" | "options";
      assetId: string;
    }
  | {
      kind: "unhide_asset";
      requestId: string;
      surface: "popup" | "options";
      assetId: string;
    }
  | {
      kind: "queue_solana_send";
      requestId: string;
      surface: "popup" | "options";
      toAddress: string;
      amountFormatted: string;
      assetType?: "native" | "spl";
      tokenAddress?: string | null;
      symbol?: string | null;
      decimals?: number | null;
      balanceRaw?: string | null;
    }
  | {
      kind: "queue_evm_approve_token";
      requestId: string;
      surface: "popup" | "options";
      chainId: number;
      tokenAddress: string;
      tokenSymbol: string;
      tokenDecimals?: number | null;
      spender: string;
      amountRaw: string;
      amountFormatted?: string | null;
      currentAllowanceRaw?: string | null;
      requiredAllowanceRaw?: string | null;
      approvalMode: "exact" | "infinite";
    }
  | {
      kind: "queue_evm_swap_approval";
      requestId: string;
      surface: "popup" | "options";
      quote: EvmSwapQuoteResponse;
      slippageBps?: number | null;
    }
  | {
      kind: "queue_universal_swap_approval";
      requestId: string;
      surface: "popup" | "options";
      provider: "jupiter" | "rango";
      route:
        | SolanaSwapQuoteResponse
        | SolanaSwapTransactionDraftResponse
        | RangoSwapQuoteResponse;
      slippageBps?: number | null;
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
      kind: "create_extension_wallet";
      requestId: string;
      surface: "popup" | "options";
      name: string;
      passcode: string;
    }
  | {
      kind: "import_extension_wallet";
      requestId: string;
      surface: "popup" | "options";
      name: string;
      mnemonic: string;
      passcode: string;
    }
  | {
      kind: "unlock_extension_wallet";
      requestId: string;
      surface: "popup" | "options";
      passcode: string;
    }
  | {
      kind: "lock_extension_wallet";
      requestId: string;
      surface: "popup" | "options";
    }
  | {
      kind: "reset_extension_wallet";
      requestId: string;
      surface: "popup" | "options";
    }
  | {
      kind: "queue_walletconnect_pairing";
      requestId: string;
      surface: "options";
      uri: string;
      title?: string;
    }
  | {
      kind: "queue_session_request_preview";
      requestId: string;
      surface: "options";
      sessionId: string;
      requestKind: Exclude<DappRequest["kind"], "connect">;
      chainId?: number | null;
      summary?: string;
    }
  | {
      kind: "confirm_signer_unlock";
      requestId: string;
      surface: "popup" | "options";
      intentId: string;
    }
  | {
      kind: "reject_signer_unlock";
      requestId: string;
      surface: "popup" | "options";
      intentId: string;
    };

export type ExtensionWalletCreateResult = {
  profileId: string;
  name: string;
  account: string;
  mnemonic: string;
  encryptedVault: EncryptedVaultV1;
  warning: string;
};

export type ExtensionWalletImportResult = Omit<
  ExtensionWalletCreateResult,
  "mnemonic"
>;

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
  "Multichain session request shell",
  "Signer unlock layer",
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
  activityLog?: ExtensionActivityRecord[];
  signerUnlockQueue?: SignerUnlockIntent[];
  activeOriginBridge?: DappBridgeSessionView | null;
  lastUpdatedAt?: string;
  providerInjection?: BackgroundStateSnapshot["providerInjection"];
  walletExposureMode?: BackgroundStateSnapshot["walletExposureMode"];
  walletExposedAccounts?: BackgroundStateSnapshot["walletExposedAccounts"];
  walletLastSyncedAt?: string | null;
  extensionVaultStatus?: ExtensionVaultStatus;
  executionEnabled?: boolean;
}): BackgroundStateSnapshot {
  return {
    phase: "permission_shell",
    providerInjection: input?.providerInjection ?? "stub_only",
    executionEnabled: input?.executionEnabled ?? true,
    proposals: input?.proposals ?? [],
    sessions: input?.sessions ?? [],
    pendingRequests: input?.pendingRequests ?? [],
    approvalResults: input?.approvalResults ?? [],
    activityLog: input?.activityLog ?? [],
    signerUnlockQueue: input?.signerUnlockQueue ?? [],
    activeOriginBridge: input?.activeOriginBridge ?? null,
    walletExposureMode: input?.walletExposureMode ?? "preview_accounts",
    walletExposedAccounts: input?.walletExposedAccounts ?? [],
    walletLastSyncedAt: input?.walletLastSyncedAt ?? null,
    extensionVaultStatus:
      input?.extensionVaultStatus
      ?? {
        hasVault: false,
        isUnlocked: false,
        activeProfileId: null,
        profiles: [],
        unlockedAt: null,
        createdAt: null,
        updatedAt: null,
      },
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

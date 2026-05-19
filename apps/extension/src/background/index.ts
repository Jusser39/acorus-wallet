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
  type ChainFamily,
  type DappShellSnapshot,
} from "@acorus/shared";
import {
  type AcorusProviderMethod,
  createRequestId,
  createSkeletonState,
  isAcorusProviderMethod,
  type ExtensionRuntimeMessage,
  type ExtensionRuntimeResponse,
  type SignerUnlockIntent,
} from "../shared/protocol";
import {
  createExtensionWallet,
  executeExtensionSendTransaction,
  executeExtensionSignMessage,
  executeExtensionSignTransaction,
  executeExtensionSignTypedData,
  getExtensionVaultStatus,
  importExtensionWallet,
  lockExtensionWallet,
  unlockExtensionWallet,
} from "./extension-wallet";
import {
  addCustomEvmNetwork,
  getActiveExtensionChainId,
  resolveExtensionNetwork,
  setActiveExtensionChainId,
} from "./extension-chain-registry";
import {
  buildExtensionPortfolioSnapshot,
  hideAsset,
  unhideAsset,
  watchAsset,
} from "./extension-assets";
import { buildApprovalRiskWarning } from "./request-risk";
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
const pendingProviderExecutions = new Map<
  string,
  {
    method: AcorusProviderMethod;
    params: unknown[];
  }
>();
const pendingSignerUnlocks = new Map<string, SignerUnlockIntent>();
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

export async function handleRuntimeMessage(
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
    const queuedSignerUnlocks = getSignerUnlockQueue();
    const signerRequestIds = new Set(
      queuedSignerUnlocks.map((intent) => intent.requestId),
    );
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
        pendingRequests: state.pendingRequests.filter(
          (request) => !signerRequestIds.has(request.id),
        ),
        approvalResults: state.approvalResults,
        signerUnlockQueue: queuedSignerUnlocks,
        activeOriginBridge: activeOrigin
          ? createDappBridgeSessionView(state, activeOrigin)
          : null,
        lastUpdatedAt: state.updatedAt,
        providerInjection:
          walletExposureMode === "wallet_backed"
            ? "wallet_bridge"
            : "preview_bridge",
        executionEnabled: true,
        walletExposureMode,
        walletExposedAccounts: walletState.profiles,
        walletLastSyncedAt: walletState.lastSyncedAt,
        extensionVaultStatus,
      }),
    };
  }

  if (input.kind === "get_extension_home") {
    const activeChainId = await getActiveExtensionChainId();
    return {
      requestId,
      ok: true,
      result: await buildExtensionPortfolioSnapshot({ activeChainId }),
    };
  }

  if (input.kind === "set_active_extension_chain") {
    try {
      const chainId = await setActiveExtensionChainId(input.chainId);
      return {
        requestId,
        ok: true,
        result: await buildExtensionPortfolioSnapshot({ activeChainId: chainId }),
      };
    } catch (error) {
      return providerError(
        requestId,
        "unsupported_chain",
        error instanceof Error ? error.message : "Unable to switch extension chain.",
      );
    }
  }

  if (input.kind === "add_custom_evm_chain") {
    try {
      const network = await addCustomEvmNetwork(input.chain);
      await setActiveExtensionChainId(network.chainId);
      return {
        requestId,
        ok: true,
        result: network,
      };
    } catch (error) {
      return providerError(
        requestId,
        "add_chain_failed",
        error instanceof Error ? error.message : "Unable to add custom EVM chain.",
      );
    }
  }

  if (input.kind === "watch_asset") {
    try {
      return {
        requestId,
        ok: true,
        result: await watchAsset(input.asset),
      };
    } catch (error) {
      return providerError(
        requestId,
        "watch_asset_failed",
        error instanceof Error ? error.message : "Unable to watch asset.",
      );
    }
  }

  if (input.kind === "hide_asset") {
    return {
      requestId,
      ok: true,
      result: await hideAsset(input.assetId),
    };
  }

  if (input.kind === "unhide_asset") {
    return {
      requestId,
      ok: true,
      result: await unhideAsset(input.assetId),
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

    if (!request) {
      return providerError(
        requestId,
        "request_not_found",
        "The pending request no longer exists.",
      );
    }

    const existingIntent = getSignerUnlockIntentByRequestId(request.id);

    if (request.kind === "add_chain" || request.kind === "watch_asset") {
      const execution = pendingProviderExecutions.get(request.id);
      const approvedAt = new Date().toISOString();

      try {
        const providerResult = await executeApprovedRequest(request, execution, approvedAt);
        const next = await approveRequestInQueue(request.id);
        pendingProviderExecutions.delete(request.id);
        resolvePendingProviderApproval(request, providerResult);

        return {
          requestId,
          ok: true,
          result: next,
        };
      } catch (error) {
        await rejectRequestInQueue(request.id);
        pendingProviderExecutions.delete(request.id);
        rejectPendingProviderApproval(
          request.id,
          "execution_failed",
          error instanceof Error ? error.message : "The extension failed to approve the request.",
        );

        return providerError(
          requestId,
          "execution_failed",
          error instanceof Error ? error.message : "The extension failed to approve the request.",
        );
      }
    }

    if (!existingIntent) {
      pendingSignerUnlocks.set(
        createSignerUnlockIntentId(request.id),
        buildSignerUnlockIntent(request),
      );
    }
    await setActivePromptOrigin(request.origin.origin);
    if (input.surface !== "popup") {
      openApprovalWindow();
    }

    return {
      requestId,
      ok: true,
      result: {
        requestId: request.id,
        signerUnlockQueued: true,
      },
    };
  }

  if (input.kind === "reject_request") {
    const current = await getDappShellState();
    const request = getPendingDappRequest(current, input.requestIdTarget);
    const next = await rejectRequestInQueue(input.requestIdTarget);

    if (request) {
      pendingProviderExecutions.delete(request.id);
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

  if (input.kind === "confirm_signer_unlock") {
    const intent = pendingSignerUnlocks.get(input.intentId);

    if (!intent) {
      return providerError(
        requestId,
        "signer_unlock_not_found",
        "The signer confirmation prompt is no longer available.",
      );
    }

    const vaultStatus = await getExtensionVaultStatus();

    if (!vaultStatus.isUnlocked) {
      return providerError(
        requestId,
        "wallet_locked",
        "Unlock Acorus Wallet extension before confirming signing.",
      );
    }

    const current = await getDappShellState();
    const request = getPendingDappRequest(current, intent.requestId);

    if (!request) {
      pendingProviderExecutions.delete(intent.requestId);
      pendingSignerUnlocks.delete(input.intentId);
      return providerError(
        requestId,
        "request_not_found",
        "The pending request was removed before signing confirmation completed.",
      );
    }

    const execution = pendingProviderExecutions.get(intent.requestId);
    const approvedAt = new Date().toISOString();
    let providerResult: unknown = createApprovedPreviewDappResult(request, approvedAt);

    try {
      providerResult = await executeApprovedRequest(request, execution, approvedAt);
    } catch (error) {
      await rejectRequestInQueue(intent.requestId);
      pendingProviderExecutions.delete(intent.requestId);
      pendingSignerUnlocks.delete(input.intentId);
      rejectPendingProviderApproval(
        intent.requestId,
        "execution_failed",
        error instanceof Error
          ? error.message
          : "The extension failed to execute the approved request.",
      );

      return providerError(
        requestId,
        "execution_failed",
        error instanceof Error
          ? error.message
          : "The extension failed to execute the approved request.",
      );
    }

    const next = await approveRequestInQueue(intent.requestId);
    pendingProviderExecutions.delete(intent.requestId);
    pendingSignerUnlocks.delete(input.intentId);
    resolvePendingProviderApproval(request, providerResult);

    return {
      requestId,
      ok: true,
      result: next,
    };
  }

  if (input.kind === "reject_signer_unlock") {
    const intent = pendingSignerUnlocks.get(input.intentId);

    if (!intent) {
      return providerError(
        requestId,
        "signer_unlock_not_found",
        "The signer confirmation prompt is no longer available.",
      );
    }

    const next = await rejectRequestInQueue(intent.requestId);
    pendingProviderExecutions.delete(intent.requestId);
    pendingSignerUnlocks.delete(input.intentId);
    rejectPendingProviderApproval(
      intent.requestId,
      "user_rejected",
      "The request was rejected during signer confirmation.",
    );

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
      pendingProviderExecutions.delete(request.id);
      pendingSignerUnlocks.delete(createSignerUnlockIntentId(request.id));
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

  if (method === "acorus_getVaultStatus") {
    return {
      requestId,
      ok: true,
      result: await getExtensionVaultStatus(),
    };
  }

  if (method === "acorus_createWallet") {
    if (!isTrustedAcorusAppOrigin(origin)) {
      return trustedAppOnlyError(requestId);
    }

    try {
      const payload = normalizeRecord(params?.[0]);
      const created = await createExtensionWallet({
        name: String(payload.name ?? "Acorus Wallet"),
        passcode: String(payload.passcode ?? ""),
      });
      await refreshDappShellWalletState();
      return { requestId, ok: true, result: created };
    } catch (error) {
      return providerError(
        requestId,
        "wallet_create_failed",
        error instanceof Error ? error.message : "Unable to create extension wallet.",
      );
    }
  }

  if (method === "acorus_importWallet") {
    if (!isTrustedAcorusAppOrigin(origin)) {
      return trustedAppOnlyError(requestId);
    }

    try {
      const payload = normalizeRecord(params?.[0]);
      const imported = await importExtensionWallet({
        name: String(payload.name ?? "Acorus Wallet"),
        mnemonic: String(payload.mnemonic ?? ""),
        passcode: String(payload.passcode ?? ""),
      });
      await refreshDappShellWalletState();
      return { requestId, ok: true, result: imported };
    } catch (error) {
      return providerError(
        requestId,
        "wallet_import_failed",
        error instanceof Error ? error.message : "Unable to import extension wallet.",
      );
    }
  }

  if (method === "acorus_unlockWallet") {
    if (!isTrustedAcorusAppOrigin(origin)) {
      return trustedAppOnlyError(requestId);
    }

    try {
      const payload = normalizeRecord(params?.[0]);
      return {
        requestId,
        ok: true,
        result: await unlockExtensionWallet({
          passcode: String(payload.passcode ?? ""),
        }),
      };
    } catch (error) {
      return providerError(
        requestId,
        "wallet_unlock_failed",
        error instanceof Error ? error.message : "Unable to unlock extension wallet.",
      );
    }
  }

  if (method === "acorus_lockWallet") {
    if (!isTrustedAcorusAppOrigin(origin)) {
      return trustedAppOnlyError(requestId);
    }

    return {
      requestId,
      ok: true,
      result: await lockExtensionWallet(),
    };
  }

  if (method === "acorus_receiveAddress") {
    const payload = normalizeRecord(params?.[0]);
    const family = typeof payload.family === "string" ? payload.family : null;
    const vaultStatus = await getExtensionVaultStatus();
    const profile = vaultStatus.profiles.find((item) =>
      (!family || item.chainFamily === family)
      && (
        payload.chainId === undefined
        || item.chainIds.some((chainId) => String(chainId) === String(payload.chainId))
      ),
    ) ?? vaultStatus.profiles.find((item) => !family || item.chainFamily === family) ?? null;

    return {
      requestId,
      ok: true,
      result: profile
        ? {
            address: profile.account,
            profileId: profile.profileId,
            chainFamily: profile.chainFamily,
            chainIds: profile.chainIds,
          }
        : null,
    };
  }

  if (method === "acorus_requestAccounts") {
    const vaultStatus = await getExtensionVaultStatus();
    const requestedFamily = parseRequestedFamily(params?.[0]);

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
        result: filterAccountsForFamily(
          bridge.accounts,
          requestedFamily,
          vaultStatus.profiles,
        ),
      };
    }

    const bridge = await ensureOriginConnectionProposal(origin, requestedFamily);
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
    const requestedFamily = parseRequestedFamily(params?.[0]);
    if (!session || !hasDappPermission(session, "view_accounts")) {
      return {
        requestId,
        ok: true,
        result: [],
      };
    }

    const vaultStatus = await getExtensionVaultStatus();
    return {
      requestId,
      ok: true,
      result: filterAccountsForFamily(
        session.accounts,
        requestedFamily,
        vaultStatus.profiles,
      ),
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

  if (method === "acorus_getPermissions") {
    return {
      requestId,
      ok: true,
      result: session?.permissions ?? [],
    };
  }

  if (method === "acorus_requestPermissions") {
    if (session) {
      await touchOriginSession(origin);
      return {
        requestId,
        ok: true,
        result: session.permissions,
      };
    }

    return handleProviderMethod(requestId, origin, "acorus_requestAccounts", params);
  }

  if (method === "acorus_revokePermissions") {
    if (session) {
      return {
        requestId,
        ok: true,
        result: await revokeSessionInRegistry(session.id),
      };
    }

    return {
      requestId,
      ok: true,
      result: null,
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

    const network = await resolveExtensionNetwork(requestedChainId);

    if (!network || network.family !== "evm") {
      return {
        requestId,
        ok: false,
        error: {
          code: "unsupported_chain",
          message:
            "The requested EVM chain is not configured in Acorus Wallet.",
        },
      };
    }

    await setActiveExtensionChainId(requestedChainId);
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

    const providerParams = params ?? [];
    const queued = queueDappRequest(state, {
      id: requestId,
      sessionId: session.id,
      kind: getRequestKindForMethod(method),
      origin,
      account: session.accounts[0] ?? null,
      chainId: getDappSessionActiveChainId(session),
      summary: buildApprovalSummary(method, providerParams, session),
      warning: buildApprovalRiskWarning({
        method,
        params: providerParams,
      }),
    });

    if (queued.created) {
      await setDappShellState(queued.snapshot);
    }

    pendingProviderExecutions.set(queued.request.id, {
      method,
      params: providerParams,
    });

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

function parseRequestedFamily(value: unknown): ChainFamily | null {
  const candidate = normalizeRecord(value).family;

  switch (candidate) {
    case "evm":
    case "solana":
    case "tron":
    case "utxo":
    case "ton":
      return candidate;
    default:
      return null;
  }
}

function filterAccountsForFamily(
  accounts: string[],
  family: ChainFamily | null,
  profiles: Array<{ account: string; chainFamily: ChainFamily }>,
): string[] {
  if (!family) {
    return accounts;
  }

  const familyAccounts = new Set(
    profiles
      .filter((profile) => profile.chainFamily === family)
      .map((profile) => profile.account),
  );

  return accounts.filter((account) => familyAccounts.has(account));
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : {};
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isTrustedAcorusAppOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      url.origin === "http://85.239.59.199:8080"
      || url.origin === "http://24wallet.ru"
      || url.origin === "https://24wallet.ru"
      || url.origin === "http://www.24wallet.ru"
      || url.origin === "https://www.24wallet.ru"
      || url.origin === "http://localhost:3000"
      || url.origin === "http://127.0.0.1:3000"
      || url.origin === "http://localhost:3024"
      || url.origin === "http://127.0.0.1:3024"
    );
  } catch {
    return false;
  }
}

function trustedAppOnlyError(requestId: string): ExtensionRuntimeResponse {
  return providerError(
    requestId,
    "trusted_app_only",
    "This wallet-management method is only available to the trusted Acorus web app.",
  );
}

function providerError(
  requestId: string,
  code: string,
  message: string,
): ExtensionRuntimeResponse {
  return {
    requestId,
    ok: false,
    error: {
      code,
      message,
    },
  };
}

function isApprovalMethod(method: AcorusProviderMethod): boolean {
  return (
    method === "acorus_addChain"
    || method === "acorus_watchAsset"
    || method === "acorus_multichainSend"
    || method === "acorus_swap"
    || method === "acorus_signMessage"
    || method === "acorus_signTypedData"
    || method === "acorus_signTransaction"
    || method === "acorus_sendTransaction"
  );
}

function getRequestKindForMethod(method: AcorusProviderMethod): DappRequestKind {
  switch (method) {
    case "acorus_addChain":
      return "add_chain";
    case "acorus_watchAsset":
      return "watch_asset";
    case "acorus_multichainSend":
      return "multichain_send";
    case "acorus_swap":
      return "swap";
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
  result: unknown,
): void {
  const pending = pendingProviderApprovals.get(request.id);

  if (!pending) {
    return;
  }

  pendingProviderApprovals.delete(request.id);
  pending.resolve({
    requestId: request.id,
    ok: true,
    result,
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

function createSignerUnlockIntentId(requestId: string): string {
  return `signer_unlock_${requestId}`;
}

function buildSignerUnlockIntent(request: DappRequest): SignerUnlockIntent {
  return {
    id: createSignerUnlockIntentId(request.id),
    requestId: request.id,
    kind: request.kind,
    origin: request.origin.origin,
    summary: request.summary,
    warning: request.warning ?? null,
    account: request.account ?? null,
    chainId: request.chainId ?? null,
    createdAt: new Date().toISOString(),
  };
}

function getSignerUnlockIntentByRequestId(
  requestId: string,
): SignerUnlockIntent | null {
  const intentId = createSignerUnlockIntentId(requestId);
  return pendingSignerUnlocks.get(intentId) ?? null;
}

function getSignerUnlockQueue(): SignerUnlockIntent[] {
  return Array.from(pendingSignerUnlocks.values()).sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
}

async function executeApprovedRequest(
  request: DappRequest,
  execution:
    | {
        method: AcorusProviderMethod;
        params: unknown[];
      }
    | undefined,
  approvedAt: string,
): Promise<unknown> {
  if (!execution) {
    return createApprovedPreviewDappResult(request, approvedAt);
  }

  switch (execution.method) {
    case "acorus_addChain": {
      const chain = await addCustomEvmNetwork(parseAddChainRequest(execution.params));
      await setActiveExtensionChainId(chain.chainId);

      return createApprovedLiveDappResult(request, approvedAt, {
        metadata: {
          chainId: chain.chainId,
          chainName: chain.name,
        },
      });
    }
    case "acorus_watchAsset": {
      const asset = await watchAsset(parseWatchAssetRequest(
        execution.params,
        request.chainId ?? 1,
      ));

      return createApprovedLiveDappResult(request, approvedAt, {
        metadata: {
          assetId: asset.id,
          symbol: asset.symbol,
        },
      });
    }
    case "acorus_signMessage":
      return createApprovedLiveDappResult(request, approvedAt, {
        signature: await executeExtensionSignMessage({
          params: execution.params,
          chainId: request.chainId ?? null,
          account: request.account ?? null,
        }),
      });
    case "acorus_signTypedData":
      return createApprovedLiveDappResult(request, approvedAt, {
        signature: await executeExtensionSignTypedData({
          params: execution.params,
          chainId: request.chainId ?? null,
          account: request.account ?? null,
        }),
      });
    case "acorus_signTransaction":
      return createApprovedLiveDappResult(request, approvedAt, {
        signature: await executeExtensionSignTransaction({
          params: execution.params,
          chainId: request.chainId ?? null,
          account: request.account ?? null,
        }),
      });
    case "acorus_sendTransaction":
      return createApprovedLiveDappResult(request, approvedAt, {
        transactionHash: await executeExtensionSendTransaction({
          params: execution.params,
          chainId: request.chainId ?? null,
          account: request.account ?? null,
        }),
      });
    default:
      return createApprovedPreviewDappResult(request, approvedAt);
  }
}

function createApprovedLiveDappResult(
  request: DappRequest,
  approvedAt: string,
  input: {
    signature?: string | null;
    transactionHash?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): {
  requestId: string;
  kind: DappRequestKind;
  status: "approved_live";
  account: string | null;
  chainId: ChainId | null;
  summary: string;
  warning: string;
  approvedAt: string;
  signature: string | null;
  transactionHash: string | null;
  metadata: Record<string, unknown> | null;
} {
  return {
    requestId: request.id,
    kind: request.kind,
    status: "approved_live",
    account: request.account ?? null,
    chainId: request.chainId ?? null,
    summary: request.summary,
    warning:
      "Approved and executed inside Acorus Wallet extension after explicit signer confirmation.",
    approvedAt,
    signature: input.signature ?? null,
    transactionHash: input.transactionHash ?? null,
    metadata: input.metadata ?? null,
  };
}

function parseAddChainRequest(params: unknown[]): Parameters<typeof addCustomEvmNetwork>[0] {
  const payload = normalizeRecord(params[0]);
  const nativeCurrency = normalizeRecord(payload.nativeCurrency);
  const rawChainId = String(payload.chainId ?? "");

  return {
    chainId: Number.parseInt(
      rawChainId,
      rawChainId.startsWith("0x") ? 16 : 10,
    ),
    chainName: String(payload.chainName ?? ""),
    nativeCurrency: {
      name: String(nativeCurrency.name ?? ""),
      symbol: String(nativeCurrency.symbol ?? ""),
      decimals: Number(nativeCurrency.decimals ?? 18),
    },
    rpcUrls: toStringArray(payload.rpcUrls),
    blockExplorerUrls: toStringArray(payload.blockExplorerUrls),
    iconUrls: toStringArray(payload.iconUrls),
  };
}

function parseWatchAssetRequest(
  params: unknown[],
  activeChainId: ChainId,
): Parameters<typeof watchAsset>[0] {
  const payload = normalizeRecord(params[0]);
  const options = normalizeRecord(payload.options);

  return {
    family: "evm",
    chainId: activeChainId,
    type: "erc20",
    symbol: String(options.symbol ?? ""),
    name: String(options.symbol ?? "Custom token"),
    decimals: Number(options.decimals ?? 18),
    tokenAddress: String(options.address ?? ""),
    logoUrl: typeof options.image === "string" ? options.image : null,
    isVerified: false,
  };
}

function buildApprovalSummary(
  method: AcorusProviderMethod,
  params: unknown[] | undefined,
  session: NonNullable<ReturnType<typeof getActiveDappSession>>,
): string {
  const chain = String(getDappSessionActiveChainId(session) ?? "n/a");
  const payload = summarizePayload(params?.[0]);

  switch (method) {
    case "acorus_addChain": {
      const addChain = parseAddChainPreview(params ?? []);
      return `Confirm network add: ${addChain.chainName || "Unknown network"} · chainId ${addChain.chainId || "n/a"} · symbol ${addChain.symbol || "n/a"} · RPC ${addChain.rpcUrl || "n/a"} · explorer ${addChain.explorerUrl || "n/a"}.`;
    }
    case "acorus_watchAsset": {
      const asset = parseWatchAssetPreview(params ?? []);
      return `Confirm token add on chain ${chain}: ${asset.symbol || "UNKNOWN"} · ${asset.address || "no address"} · decimals ${asset.decimals}.`;
    }
    case "acorus_multichainSend":
      return `Multichain send review. Active chain ${chain}. Draft preview: ${payload}.`;
    case "acorus_swap":
      return `Swap review. Active chain ${chain}. Route preview: ${payload}.`;
    case "acorus_signMessage":
      return `Sign message review on chain ${chain}. Payload preview: ${payload}.`;
    case "acorus_signTypedData":
      return `Sign typed data review on chain ${chain}. Payload preview: ${payload}.`;
    case "acorus_signTransaction":
      return `Sign transaction review on chain ${chain}. Transaction preview: ${payload}.`;
    case "acorus_sendTransaction":
      return `Send transaction review on chain ${chain}. Broadcast requires signer confirmation in the extension. Payload preview: ${payload}.`;
    default:
      return `Request review on chain ${chain}. Payload preview: ${payload}.`;
  }
}

function parseAddChainPreview(params: unknown[]): {
  chainId: string;
  chainName: string;
  rpcUrl: string;
  explorerUrl: string;
  symbol: string;
} {
  const payload = normalizeRecord(params[0]);
  const nativeCurrency = normalizeRecord(payload.nativeCurrency);
  return {
    chainId: String(payload.chainId ?? ""),
    chainName: String(payload.chainName ?? ""),
    rpcUrl: toStringArray(payload.rpcUrls)[0] ?? "",
    explorerUrl: toStringArray(payload.blockExplorerUrls)[0] ?? "",
    symbol: String(nativeCurrency.symbol ?? ""),
  };
}

function parseWatchAssetPreview(params: unknown[]): {
  address: string;
  symbol: string;
  decimals: string;
} {
  const payload = normalizeRecord(params[0]);
  const options = normalizeRecord(payload.options);
  return {
    address: String(options.address ?? ""),
    symbol: String(options.symbol ?? ""),
    decimals: String(options.decimals ?? ""),
  };
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

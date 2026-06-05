import "./node-globals";
import {
  createApprovedPreviewDappResult,
  createDappOriginMetadata,
  createDappBridgeSessionView,
  getActiveDappSession,
  getDappSessionActiveChainId,
  getPendingDappProposal,
  getPendingDappRequest,
  hasDappPermission,
  shortenFormattedEvmTokenAmount,
  queueDappRequest,
  type DappRequest,
  type DappRequestKind,
  type DappRequestReviewDetails,
  type EvmSwapQuoteResponse,
  type RangoSwapQuoteResponse,
  type SolanaSwapQuoteResponse,
  type SolanaSwapTransactionDraftResponse,
  type ChainId,
  type ChainFamily,
  type DappShellSnapshot,
} from "@acorus/shared";
import { buildSplTransferDraft, buildSwapApprovalTransaction } from "@acorus/wallet-core";
import {
  type AcorusProviderMethod,
  createSkeletonState,
  isAcorusProviderMethod,
  type ExtensionRuntimeResponse,
  type SignerUnlockIntent,
} from "../shared/protocol";
import {
  createExtensionWallet,
  executeExtensionSendTransaction,
  executeExtensionSolanaSend,
  executeExtensionSignMessage,
  executeExtensionSignTransaction,
  executeExtensionSignTypedData,
  getExtensionVaultStatus,
  importExtensionWallet,
  lockExtensionWallet,
  resetExtensionWallet,
  unlockExtensionWallet,
} from "./extension-wallet";
import {
  addCustomEvmNetwork,
  getActiveExtensionChainId,
  resolveExtensionNetwork,
  setActiveExtensionChainId,
} from "./extension-chain-registry";
import { walletConnectClient } from "./walletconnect";
import {
  buildExtensionPortfolioSnapshot,
  hideAsset,
  unhideAsset,
  watchAsset,
} from "./extension-assets";
import { buildApprovalRiskWarning } from "./request-risk";
import { appendExtensionActivity, listExtensionActivity } from "./swap-activity-store";
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
import { validateRuntimeMessage } from "./messaging";

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
  const validation = validateRuntimeMessage(message, sender, chrome.runtime.id ?? "");

  if (!validation.ok) {
    return {
      requestId: validation.requestId,
      ok: false,
      error: {
        code: validation.code,
        message: validation.message,
      },
    };
  }

  const input = validation.message;
  const requestId = input.requestId;

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
      const activityLog = await listExtensionActivity();
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
        activityLog,
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

  if (input.kind === "create_wallet") {
    try {
      const result = await createExtensionWallet({ name: input.name, passcode: input.passcode });
      return { requestId, ok: true, result };
    } catch (error: any) {
      return { requestId, ok: false, error: { code: "create_error", message: error.message } };
    }
  }

  if (input.kind === "import_wallet") {
    try {
      const result = await importExtensionWallet({ name: input.name, mnemonic: input.mnemonic, passcode: input.passcode });
      return { requestId, ok: true, result };
    } catch (error: any) {
      return { requestId, ok: false, error: { code: "import_error", message: error.message } };
    }
  }

  if (input.kind === "unlock_wallet") {
    try {
      const result = await unlockExtensionWallet({ passcode: input.passcode });
      return { requestId, ok: true, result };
    } catch (error: any) {
      return { requestId, ok: false, error: { code: "unlock_error", message: error.message } };
    }
  }

  if (input.kind === "lock_wallet") {
    try {
      lockExtensionWallet();
      return { requestId, ok: true };
    } catch (error: any) {
      return { requestId, ok: false, error: { code: "lock_error", message: error.message } };
    }
  }

  if (input.kind === "walletconnect_pair") {
    try {
      await walletConnectClient.pair(input.uri);
      return {
        requestId,
        ok: true,
        result: "success",
      };
    } catch (error) {
      return {
        requestId,
        ok: false,
        error: {
          code: "walletconnect_error",
          message: error instanceof Error ? error.message : "Failed to pair WalletConnect",
        }
      };
    }
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

  if (input.kind === "queue_solana_send") {
    try {
      return {
        requestId,
        ok: true,
        result: await queueInternalSolanaSendRequest({
          requestId,
          toAddress: input.toAddress,
          amountFormatted: input.amountFormatted,
          assetType: input.assetType ?? "native",
          tokenAddress: input.tokenAddress ?? null,
          symbol: input.symbol ?? null,
          decimals: input.decimals ?? null,
          balanceRaw: input.balanceRaw ?? null,
        }),
      };
    } catch (error) {
      return providerError(
        requestId,
        "solana_send_queue_failed",
        error instanceof Error ? error.message : "Unable to queue Solana send.",
      );
    }
  }

  if (input.kind === "queue_evm_approve_token") {
    try {
      return {
        requestId,
        ok: true,
        result: await queueInternalEvmApproveTokenRequest({
          requestId,
          chainId: input.chainId,
          tokenAddress: input.tokenAddress,
          tokenSymbol: input.tokenSymbol,
          tokenDecimals: input.tokenDecimals,
          spender: input.spender,
          amountRaw: input.amountRaw,
          amountFormatted: input.amountFormatted,
          currentAllowanceRaw: input.currentAllowanceRaw,
          requiredAllowanceRaw: input.requiredAllowanceRaw,
          approvalMode: input.approvalMode,
        }),
      };
    } catch (error) {
      return providerError(
        requestId,
        "evm_approve_queue_failed",
        error instanceof Error ? error.message : "Unable to queue token approval.",
      );
    }
  }

  if (input.kind === "queue_evm_swap_approval") {
    try {
      return {
        requestId,
        ok: true,
        result: await queueInternalEvmSwapRequest({
          requestId,
          quote: input.quote,
          slippageBps: input.slippageBps ?? null,
        }),
      };
    } catch (error) {
      return providerError(
        requestId,
        "evm_swap_queue_failed",
        error instanceof Error ? error.message : "Unable to queue swap review.",
      );
    }
  }

  if (input.kind === "queue_universal_swap_approval") {
    try {
      return {
        requestId,
        ok: true,
        result: await queueInternalUniversalSwapRequest({
          requestId,
          provider: input.provider,
          route: input.route,
          slippageBps: input.slippageBps ?? null,
        }),
      };
    } catch (error) {
      return providerError(
        requestId,
        "universal_swap_queue_failed",
        error instanceof Error ? error.message : "Unable to queue universal swap review.",
      );
    }
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

  if (input.kind === "reset_extension_wallet") {
    const status = await resetExtensionWallet();
    await refreshDappShellWalletState();

    return {
      requestId,
      ok: true,
      result: status,
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
        await recordActivityFailure(request, error, "execution_failed");
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
      await recordRejectedActivity(request);
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
      await recordActivityFailure(request, error, "execution_failed");
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

    const current = await getDappShellState();
    const request = getPendingDappRequest(current, intent.requestId);
    const next = await rejectRequestInQueue(intent.requestId);
    pendingProviderExecutions.delete(intent.requestId);
    pendingSignerUnlocks.delete(input.intentId);
    if (request) {
      await recordRejectedActivity(request);
    }
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

  if (!session && (method === "acorus_addChain" || method === "acorus_watchAsset")) {
    const providerParams = params ?? [];
    const activeChainId = await getActiveExtensionChainId();
    const queued = queueDappRequest(state, {
      id: requestId,
      sessionId: null,
      kind: getRequestKindForMethod(method),
      origin,
      account: null,
      chainId: activeChainId,
      summary: buildConnectionlessApprovalSummary(method, providerParams, activeChainId),
      warning: buildApprovalRiskWarning({
        method,
        params: providerParams,
      }),
      reviewDetails: buildRequestReviewDetails(
        method,
        providerParams,
        activeChainId,
      ),
    });

    if (queued.created) {
      await setDappShellState(queued.snapshot);
    }

    pendingProviderExecutions.set(queued.request.id, {
      method,
      params: providerParams,
    });

    await setActivePromptOrigin(origin);
    openApprovalWindow();
    return waitForProviderApproval(queued.request);
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
      reviewDetails: buildRequestReviewDetails(
        method,
        providerParams,
        getDappSessionActiveChainId(session),
      ),
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
      {
        const transactionHash = await executeExtensionSendTransaction({
          params: execution.params,
          chainId: request.chainId ?? null,
          account: request.account ?? null,
        });
        await recordSubmittedActivity(request, transactionHash);
        return createApprovedLiveDappResult(request, approvedAt, {
          transactionHash,
        });
    }
    case "acorus_swap": {
      const payload = normalizeRecord(execution.params[0]);
      if (payload.provider !== "0x") {
        assertFreshSwapQuote(payload);
        return createApprovedPreviewDappResult(request, approvedAt);
      }

      if (!payload.to || !payload.data) {
        return createApprovedPreviewDappResult(request, approvedAt);
      }

      assertFreshSwapQuote(payload);
      assertTrustedSwapExecution(request, payload);

      const transactionHash = await executeExtensionSendTransaction({
        params: [{
          from: request.account,
          to: payload.to,
          data: payload.data,
          value: payload.value ?? "0x0",
          gas: payload.gas,
          gasPrice: payload.gasPrice,
          chainId: request.chainId,
        }],
        chainId: request.chainId ?? null,
        account: request.account ?? null,
      });
      await recordSubmittedActivity(request, transactionHash);
      return createApprovedLiveDappResult(request, approvedAt, {
        transactionHash,
      });
    }
    case "acorus_multichainSend": {
      const payload = normalizeRecord(execution.params[0]);
      if (payload.family === "solana") {
        return createApprovedLiveDappResult(request, approvedAt, {
          transactionHash: await executeExtensionSolanaSend({
            params: execution.params,
            account: request.account ?? null,
          }),
        });
      }

      return createApprovedPreviewDappResult(request, approvedAt);
    }
    default:
      return createApprovedPreviewDappResult(request, approvedAt);
  }
}

async function queueInternalSolanaSendRequest(input: {
  requestId: string;
  toAddress: string;
  amountFormatted: string;
  assetType?: "native" | "spl";
  tokenAddress?: string | null;
  symbol?: string | null;
  decimals?: number | null;
  balanceRaw?: string | null;
}): Promise<{ requestId: string; queued: true }> {
  const vaultStatus = await getExtensionVaultStatus();

  if (!vaultStatus.isUnlocked) {
    throw new Error("Unlock Acorus Wallet extension before sending SOL.");
  }

  const profile = vaultStatus.profiles.find((item) => item.chainFamily === "solana");

  if (!profile) {
    throw new Error("Solana profile is not available in this wallet.");
  }

  const origin = "chrome-extension://acorus-popup";
  const state = await getDappShellState();
  const session = state.sessions.find((item) => item.id === "session_internal_solana_send")
    ?? {
      id: "session_internal_solana_send",
      origin: createDappOriginMetadata({
        origin,
        title: "Acorus Wallet Popup",
        trustLevel: "trusted",
      }),
      transport: "injected" as const,
      providerMode: "wallet_backed" as const,
      accounts: [profile.account],
      chainIds: [101],
      activeChainId: 101,
      permissions: ["multichain_send" as const],
      status: "active" as const,
      connectedAt: new Date().toISOString(),
      lastUsedAt: null,
      warning: "Internal extension send approval.",
    };
  const stateWithSession = state.sessions.some((item) => item.id === session.id)
    ? state
    : {
      ...state,
      sessions: [session, ...state.sessions],
    };
  const assetType = input.assetType === "spl" ? "spl" : "native";
  let estimatedFeeFormatted: string | null = null;
  let ataWarning: string | null = null;
  let draftCanBroadcast: boolean | null = null;

  if (assetType === "spl") {
    if (!input.tokenAddress) {
      throw new Error("SPL transfer requires a token mint address.");
    }

    const draft = await buildSplTransferDraft({
      mintAddress: input.tokenAddress,
      fromOwnerAddress: profile.account,
      toOwnerAddress: input.toAddress,
      amountFormatted: input.amountFormatted,
      decimals: input.decimals ?? 0,
      symbol: input.symbol ?? "SPL",
      balanceRaw: input.balanceRaw,
    });
    estimatedFeeFormatted = draft.feeEstimate?.feeFormatted ?? null;
    ataWarning = draft.warnings.find((warning) => warning.toLowerCase().includes("associated token account")) ?? null;
    draftCanBroadcast = draft.canBroadcast;
  }

  const providerParams = [{
    family: "solana",
    fromAddress: profile.account,
    toAddress: input.toAddress,
    amountFormatted: input.amountFormatted,
    assetType,
    tokenAddress: assetType === "spl" ? input.tokenAddress : null,
    symbol: assetType === "spl" ? input.symbol ?? "SPL" : "SOL",
    decimals: assetType === "spl" ? input.decimals ?? 0 : 9,
    balanceRaw: input.balanceRaw ?? null,
    estimatedFeeFormatted,
    ataWarning,
    draftCanBroadcast,
  }];
  const assetSymbol = assetType === "spl" ? input.symbol ?? "SPL" : "SOL";
  const queued = queueDappRequest(stateWithSession, {
    id: input.requestId,
    sessionId: session.id,
    kind: "multichain_send",
    origin,
    account: profile.account,
    chainId: 101,
    summary:
      `Send ${input.amountFormatted || "0"} ${assetSymbol} on Solana to ${input.toAddress}.`,
    warning:
      assetType === "spl" && draftCanBroadcast === false
        ? "This SPL transfer draft has blocking validation errors. Review the token, amount, and recipient before approving."
        : "Confirm only if the address and amount are correct. Solana transfers cannot be reversed.",
    reviewDetails: buildRequestReviewDetails(
      "acorus_multichainSend",
      providerParams,
      101,
    ),
  });

  await setDappShellState(queued.snapshot);
  pendingProviderExecutions.set(queued.request.id, {
    method: "acorus_multichainSend",
    params: providerParams,
  });

  return {
    requestId: queued.request.id,
    queued: true,
  };
}

async function queueInternalEvmApproveTokenRequest(input: {
  requestId: string;
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
}): Promise<{ requestId: string; queued: true }> {
  const vaultStatus = await getExtensionVaultStatus();

  if (!vaultStatus.isUnlocked) {
    throw new Error("Unlock Acorus Wallet extension before approving a token.");
  }

  const profile = vaultStatus.profiles.find((item) => item.chainFamily === "evm");

  if (!profile) {
    throw new Error("EVM profile is not available in this wallet.");
  }

  const network = await resolveExtensionNetwork(input.chainId);

  if (!network || network.family !== "evm") {
    throw new Error("Token approvals are available only for configured EVM networks.");
  }

  const tx = buildSwapApprovalTransaction({
    chainId: input.chainId,
    tokenAddress: input.tokenAddress,
    owner: profile.account,
    spender: input.spender,
    requiredAmountRaw: input.amountRaw,
  });
  const origin = "chrome-extension://acorus-popup";
  const state = await getDappShellState();
  const session = ensureInternalEvmSession(state, origin, profile.account, input.chainId);
  const stateWithSession = state.sessions.some((item) => item.id === session.id)
    ? state
    : { ...state, sessions: [session, ...state.sessions] };
  const providerParams = [{
    from: profile.account,
    to: tx.to,
    data: tx.data,
    value: tx.value,
    chainId: input.chainId,
    tokenSymbol: input.tokenSymbol,
    spender: input.spender,
    amountRaw: tx.amountRaw,
    approvalMode: "exact",
  }];
  const queued = queueDappRequest(stateWithSession, {
    id: input.requestId,
    sessionId: session.id,
    kind: "send_transaction",
    origin,
    account: profile.account,
    chainId: input.chainId,
    summary: `Approve ${input.tokenSymbol} for 0x swap spender ${input.spender}.`,
    warning: "Approve token spending only when you trust the route and spender.",
    reviewDetails: {
      kind: "token_approval",
      chainId: input.chainId,
      tokenSymbol: input.tokenSymbol,
      tokenAddress: input.tokenAddress,
      spender: input.spender,
      amountRaw: tx.amountRaw,
      amountFormatted: input.amountFormatted ?? formatApprovalAmount(
        { ...input, approvalMode: "exact" },
        tx.amountRaw,
      ),
      currentAllowanceRaw: input.currentAllowanceRaw ?? null,
      requiredAllowanceRaw: input.requiredAllowanceRaw ?? input.amountRaw,
      currentAllowanceFormatted: formatOptionalAllowance(
        input.currentAllowanceRaw,
        input.tokenDecimals,
      ),
      requiredAllowanceFormatted: formatOptionalAllowance(
        input.requiredAllowanceRaw ?? input.amountRaw,
        input.tokenDecimals,
      ),
      approvalMode: "exact",
      riskLabels: tx.riskLabels,
    },
  });

  await setDappShellState(queued.snapshot);
  await appendExtensionActivity({
    id: `${queued.request.id}_approval_requested`,
    kind: "approval_requested",
    provider: "0x",
    chainId: input.chainId,
    account: profile.account,
    tokenSymbol: input.tokenSymbol,
    amountFormatted: input.amountFormatted ?? formatApprovalAmount(
      { ...input, approvalMode: "exact" },
      tx.amountRaw,
    ),
    approvalMode: "exact",
    status: "queued",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  pendingProviderExecutions.set(queued.request.id, {
    method: "acorus_sendTransaction",
    params: providerParams,
  });

  return {
    requestId: queued.request.id,
    queued: true,
  };
}

async function queueInternalEvmSwapRequest(input: {
  requestId: string;
  quote: EvmSwapQuoteResponse;
  slippageBps?: number | null;
}): Promise<{ requestId: string; queued: true }> {
  const vaultStatus = await getExtensionVaultStatus();

  if (!vaultStatus.isUnlocked) {
    throw new Error("Unlock Acorus Wallet extension before swapping.");
  }

  const profile = vaultStatus.profiles.find((item) => item.chainFamily === "evm");

  if (!profile) {
    throw new Error("EVM profile is not available in this wallet.");
  }

  if (normalizeLowerHex(profile.account) !== normalizeLowerHex(input.quote.takerAddress)) {
    throw new Error("The quote taker does not match the selected EVM account.");
  }

  const network = await resolveExtensionNetwork(input.quote.chainId);

  if (!network || network.family !== "evm") {
    throw new Error("Swap execution is available only for configured EVM networks.");
  }

  assertFreshSwapQuote({
    expiresAt: input.quote.expiresAt,
  });

  if (!looksLikeEvmAddress(input.quote.to) || !isHexString(input.quote.data)) {
    throw new Error("Swap quote transaction is invalid.");
  }

  const origin = "chrome-extension://acorus-popup";
  const state = await getDappShellState();
  const session = ensureInternalEvmSession(state, origin, profile.account, input.quote.chainId);
  const stateWithSession = state.sessions.some((item) => item.id === session.id)
    ? state
    : { ...state, sessions: [session, ...state.sessions] };
  const providerParams = [{
    provider: "0x",
    quoteId: input.quote.requestId,
    quoteSource: "acorus_backend_0x",
    createdAt: input.quote.createdAt,
    from: profile.account,
    takerAddress: input.quote.takerAddress,
    to: input.quote.to,
    data: input.quote.data,
    dataHash: hashSwapData(input.quote.data),
    value: input.quote.value,
    gas: input.quote.gas,
    gasPrice: input.quote.gasPrice,
    chainId: input.quote.chainId,
    expiresAt: input.quote.expiresAt,
    sellTokenSymbol: input.quote.sellToken.symbol,
    buyTokenSymbol: input.quote.buyToken.symbol,
    sellAmountRaw: input.quote.sellAmountRaw,
    buyAmountRaw: input.quote.buyAmountRaw,
    sellAmountFormatted: shortenFormattedEvmTokenAmount(
      input.quote.sellAmountRaw,
      input.quote.sellToken.decimals,
    ),
    buyAmountFormatted: shortenFormattedEvmTokenAmount(
      input.quote.buyAmountRaw,
      input.quote.buyToken.decimals,
    ),
    minBuyAmountFormatted: input.quote.minBuyAmountRaw
      ? shortenFormattedEvmTokenAmount(
          input.quote.minBuyAmountRaw,
          input.quote.buyToken.decimals,
        )
      : null,
  }];
  const riskLabels = ["DEX aggregator", "Irreversible transaction"];

  if (Number(input.quote.estimatedPriceImpact) > 0.05) {
    riskLabels.push("High price impact");
  }

  if (!input.quote.sellToken.logoUrl || !input.quote.buyToken.logoUrl) {
    riskLabels.push("Custom token");
  }

  const queued = queueDappRequest(stateWithSession, {
    id: input.requestId,
    sessionId: session.id,
    kind: "swap",
    origin,
    account: profile.account,
    chainId: input.quote.chainId,
    summary: `Swap ${input.quote.sellAmountRaw} ${input.quote.sellToken.symbol} for ${input.quote.buyToken.symbol} with 0x.`,
    warning: "Rates can change before execution. Confirm only after checking the route, amount, and destination contract.",
    reviewDetails: {
      kind: "evm_swap",
      provider: "0x",
      chainId: input.quote.chainId,
      sellTokenSymbol: input.quote.sellToken.symbol,
      buyTokenSymbol: input.quote.buyToken.symbol,
      sellAmountRaw: input.quote.sellAmountRaw,
      sellAmountFormatted: shortenFormattedEvmTokenAmount(
        input.quote.sellAmountRaw,
        input.quote.sellToken.decimals,
      ),
      buyAmountRaw: input.quote.buyAmountRaw,
      buyAmountFormatted: shortenFormattedEvmTokenAmount(
        input.quote.buyAmountRaw,
        input.quote.buyToken.decimals,
      ),
      minBuyAmountRaw: input.quote.minBuyAmountRaw ?? null,
      minBuyAmountFormatted: input.quote.minBuyAmountRaw
        ? shortenFormattedEvmTokenAmount(
            input.quote.minBuyAmountRaw,
            input.quote.buyToken.decimals,
          )
        : null,
      slippageBps: input.slippageBps ?? null,
      priceImpact: input.quote.estimatedPriceImpact ?? null,
      routeLabel: input.quote.routeSummary.label,
      contractAddress: input.quote.to,
      value: input.quote.value,
      createdAt: input.quote.createdAt,
      expiresAt: input.quote.expiresAt,
      riskLabels,
    },
  });

  await setDappShellState(queued.snapshot);
  await appendExtensionActivity({
    id: `${queued.request.id}_swap_requested`,
    kind: "swap_requested",
    provider: "0x",
    chainId: input.quote.chainId,
    account: profile.account,
    sellTokenSymbol: input.quote.sellToken.symbol,
    buyTokenSymbol: input.quote.buyToken.symbol,
    amountFormatted: shortenFormattedEvmTokenAmount(
      input.quote.sellAmountRaw,
      input.quote.sellToken.decimals,
    ),
    buyAmountFormatted: shortenFormattedEvmTokenAmount(
      input.quote.buyAmountRaw,
      input.quote.buyToken.decimals,
    ),
    status: "queued",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  pendingProviderExecutions.set(queued.request.id, {
    method: "acorus_swap",
    params: providerParams,
  });

  return {
    requestId: queued.request.id,
    queued: true,
  };
}

async function queueInternalUniversalSwapRequest(input: {
  requestId: string;
  provider: "jupiter" | "rango";
  route:
    | SolanaSwapQuoteResponse
    | SolanaSwapTransactionDraftResponse
    | RangoSwapQuoteResponse;
  slippageBps?: number | null;
}): Promise<{ requestId: string; queued: true }> {
  const vaultStatus = await getExtensionVaultStatus();

  if (!vaultStatus.isUnlocked) {
    throw new Error("Unlock Acorus Wallet extension before reviewing this swap route.");
  }

  const payload = buildUniversalSwapProviderPayload(input);
  assertFreshSwapQuote({ expiresAt: payload.expiresAt });

  const preferredFamily = input.provider === "jupiter"
    ? "solana"
    : inferRangoSourceFamily(payload.fromLabel);
  const profile = vaultStatus.profiles.find((item) => item.chainFamily === preferredFamily)
    ?? vaultStatus.profiles.find((item) => item.selected)
    ?? vaultStatus.profiles[0];

  if (!profile) {
    throw new Error("No wallet profile is available for swap review.");
  }

  const origin = "chrome-extension://acorus-popup";
  const state = await getDappShellState();
  const session = ensureInternalUniversalSwapSession(
    state,
    origin,
    profile.account,
    payload.chainId,
  );
  const stateWithSession = state.sessions.some((item) => item.id === session.id)
    ? state
    : { ...state, sessions: [session, ...state.sessions] };
  const providerParams = [{
    ...payload,
    from: profile.account,
  }];
  const queued = queueDappRequest(stateWithSession, {
    id: input.requestId,
    sessionId: session.id,
    kind: "swap",
    origin,
    account: profile.account,
    chainId: payload.chainId,
    summary: `${payload.provider} route review: ${payload.sellAmountRaw} ${payload.fromLabel} to ${payload.toLabel}.`,
    warning: "This route is review-only in the extension until the matching adapter execution is fully audited.",
    reviewDetails: buildRequestReviewDetails(
      "acorus_swap",
      providerParams,
      payload.chainId,
    ),
  });

  await setDappShellState(queued.snapshot);
  await appendExtensionActivity({
    id: `${queued.request.id}_swap_requested`,
    kind: "swap_requested",
    provider: input.provider,
    chainId: payload.chainId,
    account: profile.account,
    sellTokenSymbol: payload.fromLabel,
    buyTokenSymbol: payload.toLabel,
    amountFormatted: payload.sellAmountFormatted ?? payload.sellAmountRaw,
    buyAmountFormatted: payload.buyAmountFormatted ?? payload.buyAmountRaw ?? null,
    status: "queued",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  pendingProviderExecutions.set(queued.request.id, {
    method: "acorus_swap",
    params: providerParams,
  });

  return {
    requestId: queued.request.id,
    queued: true,
  };
}

function ensureInternalEvmSession(
  state: DappShellSnapshot,
  origin: string,
  account: string,
  chainId: number,
) {
  return state.sessions.find((item) => item.id === "session_internal_evm_swap")
    ?? {
      id: "session_internal_evm_swap",
      origin: createDappOriginMetadata({
        origin,
        title: "Acorus Wallet Popup",
        trustLevel: "trusted",
      }),
      transport: "injected" as const,
      providerMode: "wallet_backed" as const,
      accounts: [account],
      chainIds: [chainId],
      activeChainId: chainId,
      permissions: ["send_transaction", "swap"] as const,
      status: "active" as const,
      connectedAt: new Date().toISOString(),
      lastUsedAt: null,
      warning: "Internal extension swap approval.",
    };
}

function ensureInternalUniversalSwapSession(
  state: DappShellSnapshot,
  origin: string,
  account: string,
  chainId: ChainId,
) {
  const id = `session_internal_universal_swap_${String(chainId)}`;
  return state.sessions.find((item) => item.id === id)
    ?? {
      id,
      origin: createDappOriginMetadata({
        origin,
        title: "Acorus Wallet Popup",
        trustLevel: "trusted",
      }),
      transport: "injected" as const,
      providerMode: "wallet_backed" as const,
      accounts: [account],
      chainIds: [chainId],
      activeChainId: chainId,
      permissions: ["swap"] as const,
      status: "active" as const,
      connectedAt: new Date().toISOString(),
      lastUsedAt: null,
      warning: "Internal universal swap review.",
    };
}

function buildUniversalSwapProviderPayload(input: {
  provider: "jupiter" | "rango";
  route:
    | SolanaSwapQuoteResponse
    | SolanaSwapTransactionDraftResponse
    | RangoSwapQuoteResponse;
  slippageBps?: number | null;
}): Record<string, unknown> & {
  provider: "jupiter" | "rango";
  quoteSource: "acorus_backend_jupiter" | "acorus_backend_rango";
  chainId: ChainId;
  fromLabel: string;
  toLabel: string;
  sellAmountRaw: string;
  sellAmountFormatted?: string | null;
  buyAmountRaw?: string | null;
  buyAmountFormatted?: string | null;
  minBuyAmountRaw?: string | null;
  routeLabel: string;
  slippageBps?: number | null;
  expiresAt: string;
  executionStatus: "review_only";
} {
  if (input.provider === "jupiter" && input.route.provider === "jupiter") {
    const routeLabel = input.route.routeSummary
      .map((step) => step.protocolName)
      .filter((label): label is string => Boolean(label))
      .join(" + ");

    return {
      provider: "jupiter",
      quoteSource: "acorus_backend_jupiter",
      chainId: 101,
      fromLabel: shortMintLabel(input.route.inputMint),
      toLabel: shortMintLabel(input.route.outputMint),
      sellAmountRaw: input.route.inAmountRaw,
      buyAmountRaw: input.route.outAmountRaw,
      minBuyAmountRaw: input.route.otherAmountThresholdRaw ?? null,
      routeLabel: routeLabel || "Jupiter best route",
      slippageBps: input.slippageBps ?? input.route.slippageBps,
      expiresAt: input.route.expiresAt,
      executionStatus: "review_only",
      swapTransactionHash: "swapTransaction" in input.route
        ? hashSwapData(input.route.swapTransaction)
        : null,
    };
  }

  if (input.provider === "rango" && input.route.provider === "rango") {
    return {
      provider: "rango",
      quoteSource: "acorus_backend_rango",
      chainId: "crosschain",
      fromLabel: input.route.from,
      toLabel: input.route.to,
      sellAmountRaw: input.route.amountRaw,
      sellAmountFormatted: input.route.amountRaw,
      buyAmountRaw: input.route.outputAmountRaw ?? null,
      buyAmountFormatted: input.route.outputAmountFormatted ?? input.route.outputAmountRaw ?? null,
      routeLabel: input.route.routeLabel || "Rango best route",
      slippageBps: input.slippageBps ?? null,
      expiresAt: input.route.expiresAt,
      executionStatus: "review_only",
      resultType: input.route.resultType ?? null,
    };
  }

  throw new Error("Swap provider and route payload do not match.");
}

function inferRangoSourceFamily(label: string): ChainFamily {
  const upper = label.toUpperCase();

  if (upper.startsWith("SOL.")) {
    return "solana";
  }

  if (upper.startsWith("TRON.") || upper.startsWith("TRX.")) {
    return "tron";
  }

  return "evm";
}

function shortMintLabel(value: string): string {
  if (value === "So11111111111111111111111111111111111111112") {
    return "SOL";
  }

  if (value === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") {
    return "USDC";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function assertFreshSwapQuote(payload: Record<string, unknown>): void {
  const expiresAt = typeof payload.expiresAt === "string"
    ? new Date(payload.expiresAt).getTime()
    : null;

  if (!expiresAt || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new Error("Swap quote expired. Refresh the quote before approving.");
  }
}

function assertTrustedSwapExecution(
  request: DappRequest,
  payload: Record<string, unknown>,
): void {
  if (payload.provider !== "0x" || payload.quoteSource !== "acorus_backend_0x") {
    throw new Error("Swap quote came from an untrusted source.");
  }

  if (Number(payload.chainId) !== Number(request.chainId)) {
    throw new Error("Swap quote chain no longer matches the active request chain.");
  }

  if (
    normalizeLowerHex(String(payload.from ?? "")) !== normalizeLowerHex(String(request.account ?? ""))
    || normalizeLowerHex(String(payload.takerAddress ?? "")) !== normalizeLowerHex(String(request.account ?? ""))
  ) {
    throw new Error("Swap quote taker no longer matches the selected account.");
  }

  if (!isHexString(String(payload.data ?? ""))) {
    throw new Error("Swap calldata is invalid.");
  }

  if (typeof payload.dataHash !== "string" || payload.dataHash !== hashSwapData(String(payload.data))) {
    throw new Error("Swap calldata changed after quote creation.");
  }
}

function hashSwapData(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a_${(hash >>> 0).toString(16)}`;
}

async function recordSubmittedActivity(
  request: DappRequest,
  transactionHash: string,
): Promise<void> {
  if (request.reviewDetails?.kind === "token_approval") {
    await appendExtensionActivity({
      id: `${request.id}_approval_submitted`,
      kind: "approval_submitted",
      provider: "0x",
      chainId: Number(request.reviewDetails.chainId ?? request.chainId ?? 1),
      account: request.account ?? "",
      tokenSymbol: request.reviewDetails.tokenSymbol,
      amountFormatted: request.reviewDetails.amountFormatted ?? request.reviewDetails.amountRaw,
      approvalMode: request.reviewDetails.approvalMode,
      txHash: transactionHash,
      status: "submitted",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  if (request.reviewDetails?.kind === "evm_swap") {
    await appendExtensionActivity({
      id: `${request.id}_swap_submitted`,
      kind: "swap_submitted",
      provider: "0x",
      chainId: Number(request.reviewDetails.chainId ?? request.chainId ?? 1),
      account: request.account ?? "",
      sellTokenSymbol: request.reviewDetails.sellTokenSymbol,
      buyTokenSymbol: request.reviewDetails.buyTokenSymbol,
      amountFormatted: request.reviewDetails.sellAmountFormatted ?? request.reviewDetails.sellAmountRaw,
      buyAmountFormatted: request.reviewDetails.buyAmountFormatted ?? request.reviewDetails.buyAmountRaw,
      txHash: transactionHash,
      status: "submitted",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

async function recordRejectedActivity(request: DappRequest): Promise<void> {
  if (request.reviewDetails?.kind === "token_approval") {
    await appendExtensionActivity({
      id: `${request.id}_approval_rejected`,
      kind: "approval_rejected",
      provider: "0x",
      chainId: Number(request.reviewDetails.chainId ?? request.chainId ?? 1),
      account: request.account ?? "",
      tokenSymbol: request.reviewDetails.tokenSymbol,
      amountFormatted: request.reviewDetails.amountFormatted ?? request.reviewDetails.amountRaw,
      approvalMode: request.reviewDetails.approvalMode,
      status: "rejected",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  if (request.reviewDetails?.kind === "evm_swap") {
    await appendExtensionActivity({
      id: `${request.id}_swap_rejected`,
      kind: "swap_rejected",
      provider: "0x",
      chainId: Number(request.reviewDetails.chainId ?? request.chainId ?? 1),
      account: request.account ?? "",
      sellTokenSymbol: request.reviewDetails.sellTokenSymbol,
      buyTokenSymbol: request.reviewDetails.buyTokenSymbol,
      amountFormatted: request.reviewDetails.sellAmountFormatted ?? request.reviewDetails.sellAmountRaw,
      buyAmountFormatted: request.reviewDetails.buyAmountFormatted ?? request.reviewDetails.buyAmountRaw,
      status: "rejected",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

async function recordActivityFailure(
  request: DappRequest,
  error: unknown,
  errorCode: string,
): Promise<void> {
  const message = error instanceof Error
    ? error.message
    : "The extension failed to execute the request.";

  if (request.reviewDetails?.kind === "token_approval") {
    await appendExtensionActivity({
      id: `${request.id}_approval_failed`,
      kind: "approval_failed",
      provider: "0x",
      chainId: Number(request.reviewDetails.chainId ?? request.chainId ?? 1),
      account: request.account ?? "",
      tokenSymbol: request.reviewDetails.tokenSymbol,
      amountFormatted: request.reviewDetails.amountFormatted ?? request.reviewDetails.amountRaw,
      approvalMode: request.reviewDetails.approvalMode,
      status: "failed",
      errorCode,
      errorMessage: message,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  if (request.reviewDetails?.kind === "evm_swap") {
    await appendExtensionActivity({
      id: `${request.id}_swap_failed`,
      kind: "swap_failed",
      provider: "0x",
      chainId: Number(request.reviewDetails.chainId ?? request.chainId ?? 1),
      account: request.account ?? "",
      sellTokenSymbol: request.reviewDetails.sellTokenSymbol,
      buyTokenSymbol: request.reviewDetails.buyTokenSymbol,
      amountFormatted: request.reviewDetails.sellAmountFormatted ?? request.reviewDetails.sellAmountRaw,
      buyAmountFormatted: request.reviewDetails.buyAmountFormatted ?? request.reviewDetails.buyAmountRaw,
      status: "failed",
      errorCode,
      errorMessage: message,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

function formatApprovalAmount(
  input: {
    tokenDecimals?: number | null;
    approvalMode: "exact" | "infinite";
  },
  amountRaw: string,
): string {
  if (input.approvalMode === "infinite") {
    return "Unlimited";
  }

  return formatOptionalAllowance(amountRaw, input.tokenDecimals) ?? amountRaw;
}

function formatOptionalAllowance(
  amountRaw: string | null | undefined,
  decimals: number | null | undefined,
): string | null {
  if (!amountRaw) {
    return null;
  }

  if (!Number.isInteger(decimals) || decimals === null || decimals === undefined) {
    return amountRaw;
  }

  try {
    return shortenFormattedEvmTokenAmount(amountRaw, decimals);
  } catch {
    return amountRaw;
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
    case "acorus_swap": {
      const swap = normalizeRecord(params?.[0]);
      if (swap.provider === "0x") {
        return `Confirm 0x swap on chain ${chain}: ${String(swap.sellTokenSymbol ?? "sell")} to ${String(swap.buyTokenSymbol ?? "buy")}.`;
      }
      if (swap.provider === "jupiter" || swap.provider === "rango") {
        return `Review ${String(swap.provider)} route: ${String(swap.fromLabel ?? "sell")} to ${String(swap.toLabel ?? "buy")}.`;
      }
      return `Swap review. Active chain ${chain}. Route preview: ${payload}.`;
    }
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

function buildConnectionlessApprovalSummary(
  method: AcorusProviderMethod,
  params: unknown[] | undefined,
  activeChainId: ChainId | null,
): string {
  if (method === "acorus_addChain") {
    const addChain = parseAddChainPreview(params ?? []);
    return `Confirm network add: ${addChain.chainName || "Unknown network"} · chainId ${addChain.chainId || "n/a"} · symbol ${addChain.symbol || "n/a"} · RPC ${addChain.rpcUrl || "n/a"} · explorer ${addChain.explorerUrl || "n/a"}.`;
  }

  if (method === "acorus_watchAsset") {
    const asset = parseWatchAssetPreview(params ?? []);
    return `Confirm token add on chain ${String(activeChainId ?? "n/a")}: ${asset.symbol || "UNKNOWN"} · ${asset.address || "no address"} · decimals ${asset.decimals}.`;
  }

  return `Review request on chain ${String(activeChainId ?? "n/a")}.`;
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

function buildRequestReviewDetails(
  method: AcorusProviderMethod,
  params: unknown[],
  activeChainId: ChainId | null,
): DappRequestReviewDetails | null {
  if (method === "acorus_addChain") {
    const preview = parseAddChainPreview(params);
    const chainIdDecimal = parseMaybeChainId(preview.chainId);
    const rpcHostname = safeHostname(preview.rpcUrl);
    const explorerHostname = safeHostname(preview.explorerUrl);
    const riskLabels = ["Custom network"];

    if (!rpcHostname || !isKnownPublicRpcHostname(rpcHostname)) {
      riskLabels.push("Unknown RPC");
    }

    return {
      kind: "add_chain",
      chainName: preview.chainName,
      chainIdDecimal,
      chainIdHex: chainIdDecimal === null ? preview.chainId : `0x${chainIdDecimal.toString(16)}`,
      rpcUrl: preview.rpcUrl,
      rpcHostname: rpcHostname || "unknown",
      explorerUrl: preview.explorerUrl,
      explorerHostname: explorerHostname || "none",
      nativeSymbol: preview.symbol,
      riskLabels,
    };
  }

  if (method === "acorus_watchAsset") {
    const preview = parseWatchAssetPreview(params);
    const decimals = Number(preview.decimals);
    return {
      kind: "watch_asset",
      chainId: activeChainId,
      tokenAddress: preview.address,
      symbol: preview.symbol,
      decimals: Number.isFinite(decimals) ? decimals : null,
      riskLabels: ["Token not verified"],
    };
  }

  if (method === "acorus_multichainSend") {
    const payload = normalizeRecord(params[0]);
    if (payload.family === "solana") {
      const assetType = payload.assetType === "spl" ? "spl" : "native";
      const tokenAddress = typeof payload.tokenAddress === "string"
        ? payload.tokenAddress
        : null;
      const ataWarning = typeof payload.ataWarning === "string"
        ? payload.ataWarning
        : null;
      const estimatedFeeFormatted = typeof payload.estimatedFeeFormatted === "string"
        ? payload.estimatedFeeFormatted
        : null;
      const riskLabels = ["Irreversible transfer"];

      if (assetType === "spl") {
        riskLabels.push("SPL token transfer");
      }

      if (ataWarning) {
        riskLabels.push("ATA create");
      }

      return {
        kind: "multichain_send",
        family: "solana",
        chainId: activeChainId ?? 101,
        fromAddress: String(payload.fromAddress ?? payload.from ?? ""),
        toAddress: String(payload.toAddress ?? payload.to ?? ""),
        assetSymbol: String(payload.symbol ?? (assetType === "spl" ? "SPL" : "SOL")),
        assetType,
        tokenAddress,
        amountFormatted: String(payload.amountFormatted ?? payload.amount ?? ""),
        estimatedFeeFormatted,
        ataWarning,
        riskLabels,
      };
    }
  }

  if (method === "acorus_sendTransaction") {
    const payload = normalizeRecord(params[0]);
    if (
      payload.approvalKind === "token_approval"
      || (typeof payload.tokenSymbol === "string" && typeof payload.spender === "string")
    ) {
      return {
        kind: "token_approval",
        chainId: activeChainId,
        tokenSymbol: String(payload.tokenSymbol ?? "TOKEN"),
        tokenAddress: String(payload.to ?? payload.tokenAddress ?? ""),
        spender: String(payload.spender ?? ""),
        amountRaw: String(payload.amountRaw ?? ""),
        amountFormatted: typeof payload.amountFormatted === "string"
          ? payload.amountFormatted
          : null,
        currentAllowanceRaw: typeof payload.currentAllowanceRaw === "string"
          ? payload.currentAllowanceRaw
          : null,
        requiredAllowanceRaw: typeof payload.requiredAllowanceRaw === "string"
          ? payload.requiredAllowanceRaw
          : null,
        currentAllowanceFormatted: typeof payload.currentAllowanceFormatted === "string"
          ? payload.currentAllowanceFormatted
          : null,
        requiredAllowanceFormatted: typeof payload.requiredAllowanceFormatted === "string"
          ? payload.requiredAllowanceFormatted
          : null,
        approvalMode: "exact",
        riskLabels: [
          "Token approval required",
          "Exact allowance",
          "Custom spender",
        ],
      };
    }
  }

  if (method === "acorus_swap") {
    const payload = normalizeRecord(params[0]);
    if (payload.provider === "0x") {
      const riskLabels = ["DEX aggregator", "Irreversible transaction"];

      if (payload.priceImpact && Number(payload.priceImpact) > 0.05) {
        riskLabels.push("High price impact");
      }

      return {
        kind: "evm_swap",
        provider: "0x",
        chainId: activeChainId,
        sellTokenSymbol: String(payload.sellTokenSymbol ?? "SELL"),
        buyTokenSymbol: String(payload.buyTokenSymbol ?? "BUY"),
        sellAmountRaw: String(payload.sellAmountRaw ?? ""),
        buyAmountRaw: String(payload.buyAmountRaw ?? ""),
        minBuyAmountRaw: typeof payload.minBuyAmountRaw === "string" ? payload.minBuyAmountRaw : null,
        slippageBps: typeof payload.slippageBps === "number" ? payload.slippageBps : null,
        priceImpact: typeof payload.priceImpact === "string" ? payload.priceImpact : null,
        routeLabel: String(payload.routeLabel ?? "0x route"),
        contractAddress: String(payload.to ?? ""),
        value: String(payload.value ?? "0"),
        riskLabels,
      };
    }

    if (payload.provider === "jupiter" || payload.provider === "rango") {
      const riskLabels = [
        payload.provider === "jupiter" ? "Solana aggregator" : "Cross-chain aggregator",
        "Review-only route",
      ];

      if (payload.provider === "rango") {
        riskLabels.push("Bridge route");
      }

      return {
        kind: "universal_swap",
        provider: payload.provider,
        chainId: typeof payload.chainId === "string" || typeof payload.chainId === "number"
          ? payload.chainId
          : activeChainId,
        fromLabel: String(payload.fromLabel ?? "Sell asset"),
        toLabel: String(payload.toLabel ?? "Buy asset"),
        sellAmountRaw: String(payload.sellAmountRaw ?? ""),
        sellAmountFormatted: typeof payload.sellAmountFormatted === "string"
          ? payload.sellAmountFormatted
          : null,
        buyAmountRaw: typeof payload.buyAmountRaw === "string"
          ? payload.buyAmountRaw
          : null,
        buyAmountFormatted: typeof payload.buyAmountFormatted === "string"
          ? payload.buyAmountFormatted
          : null,
        minBuyAmountRaw: typeof payload.minBuyAmountRaw === "string"
          ? payload.minBuyAmountRaw
          : null,
        slippageBps: typeof payload.slippageBps === "number"
          ? payload.slippageBps
          : null,
        routeLabel: String(payload.routeLabel ?? `${payload.provider} route`),
        executionStatus: "review_only",
        expiresAt: typeof payload.expiresAt === "string" ? payload.expiresAt : null,
        riskLabels,
      };
    }
  }

  return null;
}

function parseMaybeChainId(value: string): number | null {
  const parsed = Number.parseInt(value, value.startsWith("0x") ? 16 : 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeHostname(value: string): string {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

function isKnownPublicRpcHostname(hostname: string): boolean {
  return [
    "publicnode.com",
    "ankr.com",
    "infura.io",
    "alchemy.com",
    "quicknode.pro",
    "llamarpc.com",
  ].some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`));
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

function looksLikeEvmAddress(value: unknown): value is string {
  return typeof value === "string" && /^0x[0-9a-f]{40}$/iu.test(value);
}

function isHexString(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-f]+$/iu.test(value);
}

function normalizeLowerHex(value: string): string {
  return value.trim().toLowerCase();
}

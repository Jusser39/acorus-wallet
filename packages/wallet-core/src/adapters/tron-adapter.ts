import type { ReceiveInfo, SendDraft, SendExecutionResult } from "@acorus/shared";
import type { ChainAdapter } from "./types";
import { notImplemented } from "./types";

export function createTronAdapter(): ChainAdapter {
  const chainId = "tron-mainnet";

  return {
    family: "tron",
    chainId,
    name: "Tron",
    nativeAsset: {
      family: "tron",
      chainId,
      type: "native",
      symbol: "TRX",
      name: "Tron",
      decimals: 6,
      tokenAddress: null,
      isVerified: true,
    },
    capabilities: {
      deriveAccount: false,
      nativeBalance: false,
      tokenBalances: false,
      receive: true,
      sendDraft: true,
      broadcast: false,
      history: false,
      swap: false,
    },

    validateAddress(address: string): boolean {
      return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
    },

    async getNativeBalance() {
      return notImplemented("tron_native_balance");
    },

    async getTokenBalances() {
      return notImplemented("tron_token_balances");
    },

    getReceiveInfo(input: { address: string }): ReceiveInfo {
      return {
        family: "tron",
        chainId,
        address: input.address,
        qrValue: input.address,
        warning: "Tron support is skeleton-only in this version. Verify network before receiving funds.",
        explorerUrl: `https://tronscan.org/#/address/${input.address}`,
      };
    },

    buildExplorerAddressUrl(address: string): string {
      return `https://tronscan.org/#/address/${address}`;
    },

    buildExplorerTxUrl(txHash: string): string {
      return `https://tronscan.org/#/transaction/${txHash}`;
    },

    async createSendDraft(input): Promise<SendDraft> {
      return {
        family: "tron",
        chainId,
        fromAddress: input.fromAddress,
        toAddress: input.toAddress,
        normalizedToAddress: input.toAddress,
        asset: input.asset,
        amountRaw: input.amountRaw ?? "0",
        amountFormatted: input.amountFormatted ?? "0",
        supportStatus: "skeleton",
        feeEstimate: null,
        issues: [
          {
            code: "tron_send_not_implemented",
            severity: "error",
            message: "Tron sending is not implemented yet.",
          },
        ],
        warnings: [],
        errors: ["Tron sending is not implemented yet."],
        canProceed: false,
        canBroadcast: false,
        createdAt: new Date().toISOString(),
      };
    },

    async broadcastSend(): Promise<SendExecutionResult> {
      return {
        family: "tron",
        chainId,
        status: "unsupported",
        txHash: null,
        explorerUrl: null,
        errorCode: "tron_broadcast_not_enabled",
        errorMessage: "Tron broadcast is not implemented yet.",
        broadcastProvider: "tron",
        submittedAt: new Date().toISOString(),
      };
    },
  };
}

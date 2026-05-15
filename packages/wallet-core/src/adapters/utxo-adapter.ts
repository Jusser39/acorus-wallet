import type { ReceiveInfo, SendDraft } from "@acorus/shared";
import type { ChainAdapter } from "./types";
import { notImplemented } from "./types";

export function createBitcoinAdapter(): ChainAdapter {
  const chainId = "bitcoin-mainnet";

  return {
    family: "utxo",
    chainId,
    name: "Bitcoin",
    nativeAsset: {
      family: "utxo",
      chainId,
      type: "utxo",
      symbol: "BTC",
      name: "Bitcoin",
      decimals: 8,
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
      return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}$/.test(address);
    },

    async getNativeBalance() {
      return notImplemented("bitcoin_native_balance");
    },

    async getTokenBalances() {
      return [];
    },

    getReceiveInfo(input: { address: string }): ReceiveInfo {
      return {
        family: "utxo",
        chainId,
        address: input.address,
        qrValue: input.address,
        warning: "Bitcoin support is skeleton-only in this version. Verify network before receiving funds.",
        explorerUrl: `https://mempool.space/address/${input.address}`,
      };
    },

    buildExplorerAddressUrl(address: string): string {
      return `https://mempool.space/address/${address}`;
    },

    buildExplorerTxUrl(txHash: string): string {
      return `https://mempool.space/tx/${txHash}`;
    },

    async createSendDraft(input): Promise<SendDraft> {
      return {
        family: "utxo",
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
            code: "bitcoin_send_not_implemented",
            severity: "error",
            message: "Bitcoin sending is not implemented yet.",
          },
        ],
        warnings: [],
        errors: ["Bitcoin sending is not implemented yet."],
        canProceed: false,
        canBroadcast: false,
        createdAt: new Date().toISOString(),
      };
    },
  };
}

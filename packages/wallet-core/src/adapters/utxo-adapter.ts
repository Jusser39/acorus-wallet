import type { ReceiveInfo } from "@acorus/shared";
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
      sendDraft: false,
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
  };
}

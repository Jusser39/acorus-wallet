import type { AssetBalance, DerivedAccount, ReceiveInfo } from "@acorus/shared";
import { getCuratedTokens } from "@acorus/shared";
import type { ChainAdapter } from "./types";
import {
  deriveSolanaAddressFromMnemonic,
  isValidSolanaAddress,
} from "../solana/derive";
import { getSolanaNativeBalance } from "../solana/balance";
import { getSolanaSplTokenBalances } from "../solana/tokens";

export function createSolanaAdapter(): ChainAdapter {
  const chainId = 101;

  return {
    family: "solana",
    chainId,
    name: "Solana",
    nativeAsset: {
      family: "solana",
      chainId,
      type: "native",
      symbol: "SOL",
      name: "Solana",
      decimals: 9,
      tokenAddress: null,
      isVerified: true,
    },
    capabilities: {
      deriveAccount: true,
      nativeBalance: true,
      tokenBalances: true,
      receive: true,
      sendDraft: false,
      broadcast: false,
      history: false,
      swap: false,
    },

    validateAddress(address: string): boolean {
      return isValidSolanaAddress(address);
    },

    deriveAccount(input: { mnemonic: string; accountIndex?: number }): DerivedAccount {
      const account = deriveSolanaAddressFromMnemonic({
        mnemonic: input.mnemonic,
      });

      return {
        family: "solana",
        chainId,
        publicAddress: account.publicAddress,
        derivationPath: account.derivationPath,
      };
    },

    async getNativeBalance(input): Promise<AssetBalance> {
      const balance = await getSolanaNativeBalance({
        address: input.address,
        rpcUrl: input.rpcUrl,
      });

      return {
        family: "solana",
        chainId,
        type: "native",
        symbol: "SOL",
        name: "Solana",
        decimals: 9,
        tokenAddress: null,
        isVerified: true,
        balanceRaw: balance.lamports,
        balanceFormatted: balance.sol,
      };
    },

    async getTokenBalances(input): Promise<AssetBalance[]> {
      const knownTokens = getCuratedTokens(chainId);
      const knownByMint = new Map(
        knownTokens.map((token) => [token.address, token]),
      );
      const balances = await getSolanaSplTokenBalances({
        ownerAddress: input.address,
        rpcUrl: input.rpcUrl,
      });

      return balances.map((balance) => {
        const known = knownByMint.get(balance.mintAddress);

        return {
          family: "solana",
          chainId,
          type: "spl",
          symbol: known?.symbol ?? "SPL",
          name: known?.name ?? "Unknown SPL Token",
          decimals: known?.decimals ?? balance.decimals,
          tokenAddress: balance.mintAddress,
          logoUrl: known?.logoUrl ?? null,
          isVerified: known?.verified ?? false,
          balanceRaw: balance.amountRaw,
          balanceFormatted: balance.amountFormatted,
        };
      });
    },

    getReceiveInfo(input: { address: string }): ReceiveInfo {
      return {
        family: "solana",
        chainId,
        address: input.address,
        qrValue: input.address,
        warning: "Send only SOL and SPL tokens on Solana to this address. Assets from other networks may be lost.",
        explorerUrl: `https://solscan.io/account/${input.address}`,
      };
    },

    buildExplorerAddressUrl(address: string): string {
      return `https://solscan.io/account/${address}`;
    },

    buildExplorerTxUrl(txHash: string): string {
      return `https://solscan.io/tx/${txHash}`;
    },
  };
}

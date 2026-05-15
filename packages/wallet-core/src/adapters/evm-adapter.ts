import type { Address } from "viem";
import { formatUnits, isAddress } from "viem";
import { EVM_CHAINS, getChainById, getCuratedTokens } from "@acorus/shared";
import type { AssetBalance, DerivedAccount, ReceiveInfo } from "@acorus/shared";
import type { ChainAdapter } from "./types";
import { getEvmAddressFromMnemonic } from "../mnemonic";
import { getErc20Balance, getNativeBalance } from "../evm/balance";
import { buildExplorerAddressUrl, buildExplorerTxUrl } from "../evm/explorer";

export function createEvmAdapter(chainId: number): ChainAdapter {
  const chain = getChainById(chainId);

  if (!chain || chain.family !== "evm") {
    throw new Error(`unsupported_evm_chain:${chainId}`);
  }

  return {
    family: "evm",
    chainId,
    name: chain.name,
    nativeAsset: {
      family: "evm",
      chainId,
      type: "native",
      symbol: chain.nativeSymbol,
      name: chain.name,
      decimals: 18,
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
      history: true,
      swap: false,
    },

    validateAddress(address: string): boolean {
      return isAddress(address);
    },

    deriveAccount(input: { mnemonic: string; accountIndex?: number }): DerivedAccount {
      const publicAddress = getEvmAddressFromMnemonic(input.mnemonic);

      return {
        family: "evm",
        chainId,
        publicAddress,
        derivationPath: `m/44'/60'/0'/0/${input.accountIndex ?? 0}`,
      };
    },

    async getNativeBalance(input): Promise<AssetBalance> {
      const env = input.rpcUrl ? { [chain.rpcUrlEnv]: input.rpcUrl } : undefined;
      const balance = await getNativeBalance(input.address as Address, chainId, env);

      return {
        family: "evm",
        chainId,
        type: "native",
        symbol: chain.nativeSymbol,
        name: chain.name,
        decimals: 18,
        tokenAddress: null,
        isVerified: true,
        balanceRaw: balance.toString(),
        balanceFormatted: formatUnits(balance, 18),
      };
    },

    async getTokenBalances(input): Promise<AssetBalance[]> {
      const env = input.rpcUrl ? { [chain.rpcUrlEnv]: input.rpcUrl } : undefined;
      const tokens = getCuratedTokens(chainId);

      return Promise.all(
        tokens.map(async (token) => {
          const balance = await getErc20Balance(
            token.address as Address,
            input.address as Address,
            chainId,
            env,
          );

          return {
            family: "evm" as const,
            chainId,
            type: "erc20" as const,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            tokenAddress: token.address,
            logoUrl: token.logoUrl,
            isVerified: token.verified,
            balanceRaw: balance.toString(),
            balanceFormatted: formatUnits(balance, token.decimals),
          };
        }),
      );
    },

    getReceiveInfo(input: { address: string }): ReceiveInfo {
      return {
        family: "evm",
        chainId,
        address: input.address,
        qrValue: input.address,
        warning: "Send only assets on the selected EVM network. Assets from other networks may be lost.",
        explorerUrl: buildExplorerAddressUrl(chainId, input.address),
      };
    },

    buildExplorerAddressUrl(address: string): string {
      return buildExplorerAddressUrl(chainId, address);
    },

    buildExplorerTxUrl(txHash: string): string {
      return buildExplorerTxUrl(chainId, txHash);
    },
  };
}

export function createAllEvmAdapters(): ChainAdapter[] {
  return EVM_CHAINS.map((chain) => createEvmAdapter(chain.chainId));
}

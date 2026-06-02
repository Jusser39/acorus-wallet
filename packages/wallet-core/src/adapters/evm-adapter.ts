import type { Address } from "viem";
import { formatUnits, getAddress, isAddress } from "viem";
import { EVM_CHAINS, getChainById, getCuratedTokens } from "@acorus/shared";
import type { AssetBalance, DerivedAccount, ReceiveInfo, SendDraft, SendExecutionResult } from "@acorus/shared";
import { type ChainAdapter, notImplemented } from "./types";
import { getEvmAddressFromMnemonic } from "../mnemonic";
import { getErc20Balance, getNativeBalance } from "../evm/balance";
import { buildExplorerAddressUrl, buildExplorerTxUrl } from "../evm/explorer";
import { sendNativeTransaction, sendErc20Transaction } from "../evm/send";

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
      sendDraft: true,
      broadcast: true,
      history: true,
      swap: false,
      dapp: false,
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

    async createSendDraft(input): Promise<SendDraft> {
      const isNative = input.asset.type === "native";
      const normalizedToAddress = isAddress(input.toAddress)
        ? getAddress(input.toAddress)
        : input.toAddress;

      return {
        family: "evm",
        chainId,
        fromAddress: input.fromAddress,
        toAddress: input.toAddress,
        normalizedToAddress,
        asset: input.asset,
        amountRaw: input.amountRaw ?? "0",
        amountFormatted: input.amountFormatted ?? "0",
        supportStatus: "supported",
        feeEstimate: {
          feeAsset: {
            family: "evm",
            chainId,
            type: "native",
            symbol: chain.nativeSymbol,
            name: chain.name,
            decimals: 18,
            tokenAddress: null,
            isVerified: true,
          },
          feeRaw: null,
          feeFormatted: null,
          gasLimit: isNative ? "21000" : "65000",
          gasPrice: null,
          maxFeePerGas: null,
          maxPriorityFeePerGas: null,
          source: "estimated",
        },
        issues: [],
        warnings: isNative
          ? []
          : ["Token transfers require native coin for gas."],
        errors: [],
        canProceed: true,
        canBroadcast: true,
        createdAt: new Date().toISOString(),
      };
    },

    async broadcastSend(input): Promise<SendExecutionResult> {
      const { draft } = input;
      const numericChainId = chainId as number;

      if (!input.mnemonic) {
        return {
          family: "evm",
          chainId: numericChainId,
          status: "rejected",
          txHash: null,
          explorerUrl: null,
          errorCode: "missing_signer",
          errorMessage: "Wallet must be unlocked before broadcasting.",
          broadcastProvider: "evm",
          submittedAt: new Date().toISOString(),
        };
      }

      if (!input.rpcUrl) {
        return {
          family: "evm",
          chainId: numericChainId,
          status: "rejected",
          txHash: null,
          explorerUrl: null,
          errorCode: "missing_rpc_url",
          errorMessage: "RPC URL is required for EVM broadcast.",
          broadcastProvider: "evm",
          submittedAt: new Date().toISOString(),
        };
      }

      const env = { [chain.rpcUrlEnv]: input.rpcUrl };
      const toAddr = (draft.normalizedToAddress ?? draft.toAddress) as Address;
      const isNative = draft.asset.type === "native";

      const txHash = isNative
        ? await sendNativeTransaction({
            mnemonic: input.mnemonic,
            chainId: numericChainId,
            to: toAddr,
            amountWei: BigInt(draft.amountRaw),
            env,
          })
        : await sendErc20Transaction({
            mnemonic: input.mnemonic,
            chainId: numericChainId,
            tokenAddress: draft.asset.tokenAddress! as Address,
            to: toAddr,
            amountUnits: BigInt(draft.amountRaw),
            env,
          });

      return {
        family: "evm",
        chainId: numericChainId,
        status: "submitted",
        txHash,
        explorerUrl: buildExplorerTxUrl(numericChainId, txHash),
        errorCode: null,
        errorMessage: null,
        broadcastProvider: "evm",
        submittedAt: new Date().toISOString(),
      };
    },

    async getTransactionHistory() {
      notImplemented("evm_history");
    },

    async getSwapQuote() {
      notImplemented("evm_swap_quote");
    },

    async executeSwap() {
      notImplemented("evm_swap_execute");
    },

    async signMessage() {
      notImplemented("evm_sign_message");
    },

    async signTypedData() {
      notImplemented("evm_sign_typed_data");
    },

    async signTransaction() {
      notImplemented("evm_sign_transaction");
    },
  };
}

export function createAllEvmAdapters(): ChainAdapter[] {
  return EVM_CHAINS.map((chain) => createEvmAdapter(chain.chainId));
}

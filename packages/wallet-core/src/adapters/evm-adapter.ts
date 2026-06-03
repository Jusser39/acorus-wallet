import type { Address } from "viem";
import { formatUnits, getAddress, isAddress } from "viem";
import { EVM_CHAINS, getChainById, getCuratedTokens } from "@acorus/shared";
import type { AssetBalance, DerivedAccount, ReceiveInfo, SendDraft, SendExecutionResult } from "@acorus/shared";
import type { ChainAdapter } from "./types";
import { getEvmAddressFromMnemonic } from "../mnemonic";
import { getErc20Balance, getNativeBalance } from "../evm/balance";
import { buildExplorerAddressUrl, buildExplorerTxUrl } from "../evm/explorer";
import { sendNativeTransaction, sendErc20Transaction } from "../evm/send";
import { createEvmWalletClient } from "../evm/client";
import { fetchZeroXQuote, type ZeroXQuoteResponse } from "../evm/swap";

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
      history: false,
      swap: true,
      dapp: true,
      nft: true,
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
      // Pending backend EVM history proxy implementation.
      return [];
    },

    async getNfts(input) {
      return [
        {
          id: `eth-mock-${Date.now()}-1`,
          name: "Mock EVM Ape #1337",
          collectionName: "Mock EVM Apes",
          imageUrl: "https://i.seadn.io/gae/Ju9CkWtV-1Okvf45wo8UctR-M9He2PjILP0oOvxE89AyiPPGtrR3gysu1Zgy0hjd2xKIgjjjqvYw6_Qj55WifR0pG7xYc1v6jYxH?auto=format&dpr=1&w=1000",
          contractAddress: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
          tokenId: "1337",
        },
        {
          id: `eth-mock-${Date.now()}-2`,
          name: "Mock Punk #3100",
          collectionName: "Mock Punks",
          imageUrl: "https://i.seadn.io/gae/BdxvLseXcfl57B52XC1c7d1e8vB1g5c5T1G-1eW5zT2k2d3D5y3pY-2_1A3f5W5h1l-X-O2E9q?auto=format&dpr=1&w=1000",
          contractAddress: "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb",
          tokenId: "3100",
        },
      ];
    },

    async getSwapQuote(input) {
      return fetchZeroXQuote({
        chainId: chainId,
        sellToken: input.sellTokenAddress,
        buyToken: input.buyTokenAddress,
        sellAmount: input.amountRaw,
        taker: input.fromAddress,
        slippageBps: input.slippageBps,
        apiBaseUrl: input.rpcUrl, // Optional fallback
      });
    },

    async executeSwap(input) {
      const numericChainId = chainId as number;
      const quote = input.quote as ZeroXQuoteResponse;

      if (!quote.transaction) {
        throw new Error("swap_quote_missing_transaction");
      }

      if (!input.mnemonic) {
        throw new Error("missing_signer");
      }

      const env = input.rpcUrl ? { [chain.rpcUrlEnv]: input.rpcUrl } : undefined;
      const walletClient = createEvmWalletClient(input.mnemonic, numericChainId, env);
      const txHash = await walletClient.sendTransaction({
        account: walletClient.account!,
        to: quote.transaction.to as Address,
        data: quote.transaction.data as `0x${string}`,
        value: BigInt(quote.transaction.value),
        chain: walletClient.chain,
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

    async signMessage(input) {
      const numericChainId = chainId as number;
      const walletClient = createEvmWalletClient(input.mnemonic, numericChainId);
      return walletClient.signMessage({
        message: input.message,
        account: walletClient.account!,
      });
    },

    async signTypedData(input) {
      const numericChainId = chainId as number;
      const walletClient = createEvmWalletClient(input.mnemonic, numericChainId);
      
      // typedData from EIP-712 usually contains domain, types, primaryType, message
      const typedData = input.typedData as any;
      return walletClient.signTypedData({
        ...typedData,
        account: walletClient.account!,
      });
    },

    async signTransaction(input) {
      const numericChainId = chainId as number;
      const walletClient = createEvmWalletClient(input.mnemonic, numericChainId);
      
      const transaction = input.transaction as any;
      return walletClient.signTransaction({
        ...transaction,
        account: walletClient.account!,
      });
    },
  };
}

export function createAllEvmAdapters(): ChainAdapter[] {
  return EVM_CHAINS.map((chain) => createEvmAdapter(chain.chainId));
}

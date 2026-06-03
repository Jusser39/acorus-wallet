import type { AssetBalance, DerivedAccount, ReceiveInfo, SendDraft, SendExecutionResult } from "@acorus/shared";
import { getCuratedTokens } from "@acorus/shared";
import type { ChainAdapter } from "./types";
import {
  deriveSolanaAddressFromMnemonic,
  isValidSolanaAddress,
} from "../solana/derive";
import { getSolanaNativeBalance } from "../solana/balance";
import { getSolanaSplTokenBalances } from "../solana/tokens";
import {
  createSolanaSendDraft,
  executeSolanaSend,
} from "../solana/send";
import {
  buildSplTransferDraft,
  executeSplTransfer,
} from "../solana/spl-transfer";
import { fetchJupiterQuote, fetchJupiterSwapTransaction, type JupiterQuoteResponse } from "../solana/swap";
import { signSolanaMessage } from "../solana/message";
import { deriveSolanaKeypairFromMnemonic } from "../solana/derive";
import { Transaction } from "@solana/web3.js";
import { createSolanaConnection } from "../solana/client";
import { buildSolanaExplorerTxUrl } from "../solana/explorer";

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
      sendDraft: true,
      broadcast: true,
      history: false,
      swap: true,
      dapp: true, nft: false,
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

    async createSendDraft(input): Promise<SendDraft> {
      if (input.asset.type === "spl") {
        return buildSplTransferDraft({
          fromOwnerAddress: input.fromAddress,
          toOwnerAddress: input.toAddress,
          amountRaw: input.amountRaw,
          amountFormatted: input.amountFormatted,
          mintAddress: input.asset.tokenAddress as string,
          decimals: input.asset.decimals,
          symbol: input.asset.symbol,
        });
      }

      return createSolanaSendDraft({
        fromAddress: input.fromAddress,
        toAddress: input.toAddress,
        amountRaw: input.amountRaw,
        amountFormatted: input.amountFormatted,
      });
    },

    async broadcastSend(input): Promise<SendExecutionResult> {
      if (!input.mnemonic) {
        return {
          family: "solana",
          chainId,
          status: "rejected",
          txHash: null,
          explorerUrl: null,
          errorCode: "missing_signer",
          errorMessage: "Wallet must be unlocked before broadcasting.",
          broadcastProvider: "solana",
          submittedAt: new Date().toISOString(),
        };
      }

      if (input.draft.asset.type === "spl") {
        return executeSplTransfer({
          mnemonic: input.mnemonic,
          fromOwnerAddress: input.draft.fromAddress,
          toOwnerAddress: input.draft.toAddress,
          amountRaw: input.draft.amountRaw,
          amountFormatted: input.draft.amountFormatted,
          mintAddress: input.draft.asset.tokenAddress as string,
          decimals: input.draft.asset.decimals,
          rpcUrl: input.rpcUrl,
        });
      }

      return executeSolanaSend({
        mnemonic: input.mnemonic,
        fromAddress: input.draft.fromAddress,
        toAddress: input.draft.toAddress,
        amountRaw: input.draft.amountRaw,
        amountFormatted: input.draft.amountFormatted,
        rpcUrl: input.rpcUrl,
      });
    },

    async getTransactionHistory() {
      // Pending backend Solana history proxy implementation.
      return [];
    },

    async getSwapQuote(input) {
      return fetchJupiterQuote({
        inputMint: input.sellTokenAddress,
        outputMint: input.buyTokenAddress,
        amount: input.amountRaw,
        slippageBps: input.slippageBps,
        apiBaseUrl: input.rpcUrl, // Optional fallback
      });
    },

    async executeSwap(input) {
      const quote = input.quote as JupiterQuoteResponse;
      if (!input.mnemonic) {
        throw new Error("missing_signer");
      }

      const keypair = deriveSolanaKeypairFromMnemonic({ mnemonic: input.mnemonic });
      
      const swapRes = await fetchJupiterSwapTransaction({
        inputMint: quote.from,
        outputMint: quote.to,
        amount: quote.fromAmountRaw,
        slippageBps: quote.slippageBps,
        userPublicKey: keypair.publicKey.toBase58(),
        apiBaseUrl: input.rpcUrl,
      });

      const swapTransactionBuf = Buffer.from(swapRes.swapTransaction, "base64");
      const transaction = Transaction.from(swapTransactionBuf);
      
      transaction.sign(keypair);

      const connection = createSolanaConnection(input.rpcUrl);
      const txHash = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      return {
        family: "solana",
        chainId,
        status: "submitted",
        txHash,
        explorerUrl: buildSolanaExplorerTxUrl(txHash),
        errorCode: null,
        errorMessage: null,
        broadcastProvider: "solana_jupiter",
        submittedAt: new Date().toISOString(),
      };
    },

    async signMessage(input) {
      if (!input.mnemonic) {
        throw new Error("missing_signer");
      }
      return signSolanaMessage({
        mnemonic: input.mnemonic,
        message: input.message,
      });
    },

    async signTypedData() {
      throw new Error("solana_sign_typed_data_unsupported");
    },

    async signTransaction(input) {
      if (!input.mnemonic) {
        throw new Error("missing_signer");
      }
      const keypair = deriveSolanaKeypairFromMnemonic({ mnemonic: input.mnemonic });
      
      // Assume input.transaction is a base64 encoded transaction or a Transaction object
      let transaction: Transaction;
      if (typeof input.transaction === "string") {
        transaction = Transaction.from(Buffer.from(input.transaction, "base64"));
      } else {
        transaction = input.transaction as Transaction;
      }

      transaction.sign(keypair);
      return transaction.serialize().toString("base64");
    },
  };
}

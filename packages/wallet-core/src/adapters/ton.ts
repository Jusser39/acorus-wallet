import {
  type AssetRef,
  type DerivedAccount,
  type SendDraft,
  type SendDraftInput,
  type SendExecutionResult,
} from "@acorus/shared";
import { type BroadcastSendInput, type ChainAdapter } from "./types";
import { wipeBytes } from "../crypto/vault";
import { mnemonicToWalletKey, mnemonicValidate } from "@ton/crypto";
import { WalletContractV4, internal, TonClient } from "@ton/ton";
import { SendMode } from "@ton/core";

const TON_CHAIN_ID = "ton-mainnet";
const DEFAULT_TON_RPC_URL = "https://toncenter.com/api/v2/jsonRPC";

const TON_NATIVE_ASSET: AssetRef = {
  family: "ton",
  chainId: TON_CHAIN_ID,
  type: "native",
  symbol: "TON",
  name: "Toncoin",
  decimals: 9,
  tokenAddress: null,
  isVerified: true,
};

export function createTonAdapter(): ChainAdapter {
  return {
    family: "ton",
    chainId: TON_CHAIN_ID,
    name: "TON",
    nativeAsset: TON_NATIVE_ASSET,
    capabilities: {
      deriveAccount: true,
      nativeBalance: true,
      tokenBalances: false,
      receive: true,
      sendDraft: true,
      broadcast: true,
      history: false,
      swap: false,
      dapp: false,
    },

    validateAddress(address) {
      try {
        // Simple heuristic or actual parsing can be done here.
        // Currently we trust external libraries. For MVP, we check basic structure.
        return typeof address === "string" && (address.length === 48 || address.length === 66);
      } catch {
        return false;
      }
    },

    async deriveAccount(input) {
      return deriveTonAccount(input.mnemonic);
    },

    async getNativeBalance(input) {
      const client = createTonClient(input.rpcUrl);
      const balanceRaw = await client.getBalance(input.address as any); // address string is automatically parsed usually, but we might need Address.parse(input.address)

      // Let's use the explicit string format for MVP and format manually
      const balanceStr = balanceRaw.toString();
      
      return {
        ...TON_NATIVE_ASSET,
        balanceRaw: balanceStr,
        balanceFormatted: formatTonUnits(balanceRaw, 9),
        source: "live_ton_rpc",
      };
    },

    async getTokenBalances() {
      // Stub for MVP
      return [];
    },

    getReceiveInfo(input) {
      return {
        family: "ton",
        chainId: TON_CHAIN_ID,
        address: input.address,
        qrValue: input.address,
        warning: "Send only Toncoin to this address. No memo is required for this non-custodial wallet.",
        explorerUrl: this.buildExplorerAddressUrl(input.address),
      };
    },

    buildExplorerAddressUrl(address) {
      return `https://tonscan.org/address/${encodeURIComponent(address)}`;
    },

    buildExplorerTxUrl(txHash) {
      return `https://tonscan.org/tx/${encodeURIComponent(txHash)}`;
    },

    async createSendDraft(input) {
      return createTonSendDraft(input);
    },

    async broadcastTransaction() {
      throw new Error("ton_broadcast_transaction_unsupported");
    },

    async broadcastSend(input) {
      return broadcastTonSend(input);
    },

    async getTransactionHistory() {
      return [];
    },

    async getSwapQuote() {
      throw new Error("ton_swap_quote_unsupported");
    },

    async executeSwap() {
      throw new Error("ton_swap_execute_unsupported");
    },

    async signMessage() {
      throw new Error("ton_sign_message_unsupported");
    },

    async signTypedData() {
      throw new Error("ton_sign_typed_data_unsupported");
    },

    async signTransaction() {
      throw new Error("ton_sign_transaction_unsupported");
    },
  };
}

async function deriveTonAccount(mnemonic: string): Promise<DerivedAccount> {
  const words = mnemonic.split(" ");
  const isValid = await mnemonicValidate(words);
  if (!isValid) {
    throw new Error("invalid_mnemonic");
  }

  const keyPair = await mnemonicToWalletKey(words);
  try {
    const workchain = 0; // standard workchain
    const wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
    const address = wallet.address.toString({ bounceable: false, testOnly: false });

    return {
      family: "ton",
      chainId: TON_CHAIN_ID,
      publicAddress: address,
      derivationPath: "m/44'/396'/0'/0'/0'", // Logical path, actual derivation is via PBKDF2 in @ton/crypto
    };
  } finally {
    wipeBytes(keyPair.secretKey);
  }
}

function createTonClient(rpcUrl?: string): TonClient {
  return new TonClient({
    endpoint: rpcUrl || DEFAULT_TON_RPC_URL,
  });
}

async function createTonSendDraft(input: SendDraftInput): Promise<SendDraft> {
  const issues: SendDraft["issues"] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  
  let amountRaw = 0n;
  if (input.amountRaw) {
    amountRaw = BigInt(input.amountRaw);
  } else if (input.amountFormatted) {
    amountRaw = parseDecimalToUnits(input.amountFormatted, 9);
  }

  if (input.asset.type !== "native") {
    errors.push("Only native TON transfers are supported.");
  }

  if (amountRaw <= 0n) {
    errors.push("Amount must be greater than zero.");
  }

  if (!input.toAddress) {
    errors.push("Recipient address is required.");
  }

  return {
    family: "ton",
    chainId: TON_CHAIN_ID,
    fromAddress: input.fromAddress,
    toAddress: input.toAddress,
    normalizedToAddress: input.toAddress,
    asset: input.asset,
    amountRaw: amountRaw.toString(),
    amountFormatted: formatTonUnits(amountRaw, 9),
    supportStatus: errors.length > 0 ? "insufficient_data" : "supported",
    feeEstimate: {
      feeAsset: TON_NATIVE_ASSET,
      feeRaw: "10000000", // ~0.01 TON fallback estimate
      feeFormatted: "0.01",
      source: "fallback",
    },
    issues,
    warnings,
    errors,
    canProceed: errors.length === 0,
    canBroadcast: errors.length === 0,
    createdAt: new Date().toISOString(),
  };
}

async function broadcastTonSend(
  input: BroadcastSendInput,
): Promise<SendExecutionResult> {
  const draft = input.draft;
  const submittedAt = new Date().toISOString();

  if (!draft.canBroadcast || draft.family !== "ton" || draft.asset.type !== "native") {
    throw new Error("invalid_ton_draft");
  }

  if (!input.mnemonic) {
    throw new Error("missing_signer");
  }

  const words = input.mnemonic.split(" ");
  const keyPair = await mnemonicToWalletKey(words);

  try {
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const client = createTonClient(input.rpcUrl);
    const contract = client.open(wallet);

    const seqno = await contract.getSeqno();

    const transferMessage = internal({
      to: draft.toAddress,
      value: BigInt(draft.amountRaw),
      bounce: false,
      body: "", // empty body
    });

    await contract.sendTransfer({
      seqno,
      secretKey: keyPair.secretKey,
      messages: [transferMessage],
      sendMode: SendMode.PAY_GAS_SEPARATELY | SendMode.IGNORE_ERRORS, // Pay gas separately, ignore errors
    });

    // The transaction doesn't return a hash immediately in the standard TonClient sendTransfer without querying.
    // For MVP, we return a pending status with an empty txHash, as typical TON wallets might poll for it.
    // Or we compute the hash locally (which is complex). We will use a placeholder hash to allow the UI to process.
    return {
      family: "ton",
      chainId: TON_CHAIN_ID,
      status: "submitted",
      txHash: "pending_ton_tx", 
      explorerUrl: `https://tonscan.org/address/${draft.fromAddress}`,
      broadcastProvider: input.rpcUrl || DEFAULT_TON_RPC_URL,
      submittedAt,
    };
  } catch (error) {
    return {
      family: "ton",
      chainId: TON_CHAIN_ID,
      status: "failed",
      txHash: null,
      explorerUrl: null,
      errorCode: "ton_broadcast_failed",
      errorMessage: error instanceof Error ? error.message : "TON broadcast failed.",
      broadcastProvider: input.rpcUrl || DEFAULT_TON_RPC_URL,
      submittedAt,
    };
  } finally {
    wipeBytes(keyPair.secretKey);
  }
}

function parseDecimalToUnits(value: string, decimals: number): bigint {
  const normalized = value.trim();
  const match = /^([0-9]+)(?:\.([0-9]+))?$/u.exec(normalized);

  if (!match) {
    return 0n;
  }

  const whole = match[1] ?? "0";
  const fraction = (match[2] ?? "").padEnd(decimals, "0").slice(0, decimals);
  return BigInt(`${whole}${fraction}`);
}

function formatTonUnits(value: bigint, decimals: number): string {
  const absolute = value < 0n ? -value : value;
  const scale = 10n ** BigInt(decimals);
  const whole = absolute / scale;
  const fraction = (absolute % scale).toString().padStart(decimals, "0").replace(/0+$/u, "");
  return `${whole.toString()}${fraction ? `.${fraction}` : ""}`;
}

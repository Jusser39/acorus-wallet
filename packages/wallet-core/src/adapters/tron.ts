import {
  type AssetRef,
  type DerivedAccount,
  type SendDraft,
  type SendDraftInput,
  type SendExecutionResult,
} from "@acorus/shared";
import { secp256k1 } from "@noble/curves/secp256k1";
import { base58 } from "@scure/base";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync, validateMnemonic } from "bip39";
import { keccak_256 } from "@noble/hashes/sha3";
import { sha256 } from "@noble/hashes/sha256";
import { wipeBytes } from "../crypto/vault";
import type { BroadcastSendInput, ChainAdapter } from "./types";

const TRON_CHAIN_ID = "tron-mainnet";
const DEFAULT_TRON_RPC_URL = "https://api.trongrid.io";
const TRON_ADDRESS_PREFIX = 0x41;
const TRON_DERIVATION_PATH_PREFIX = "m/44'/195'/0'/0";
const TRON_NATIVE_FEE_FALLBACK_SUN = 1_000_000n;
const TRC20_FEE_LIMIT_SUN = 15_000_000;
const TRON_PRIVATE_KEY_BYTES = 32;
const TRON_MAX_SAFE_RPC_AMOUNT = BigInt(Number.MAX_SAFE_INTEGER);

const TRON_NATIVE_ASSET: AssetRef = {
  family: "tron",
  chainId: TRON_CHAIN_ID,
  type: "native",
  symbol: "TRX",
  name: "Tron",
  decimals: 6,
  tokenAddress: null,
  isVerified: true,
};

type TronCreateTransactionResponse = TronTransaction & {
  txID?: string;
  Error?: string;
  code?: string;
  message?: string;
};

type TronTriggerSmartContractResponse = {
  result?: {
    result?: boolean;
    code?: string;
    message?: string;
  };
  transaction?: TronTransaction & {
    txID?: string;
  };
};

type TronTransaction = {
  raw_data?: unknown;
  raw_data_hex?: string;
  txID?: string;
  signature?: string[];
  visible?: boolean;
  [key: string]: unknown;
};

type TronBroadcastResponse = {
  result?: boolean;
  txid?: string;
  code?: string;
  message?: string;
};

type TronAccountResponse = {
  balance?: number;
};

export function createTronAdapter(): ChainAdapter {
  return {
    family: "tron",
    chainId: TRON_CHAIN_ID,
    name: "Tron",
    nativeAsset: TRON_NATIVE_ASSET,
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
      return validateTronAddress(address);
    },

    deriveAccount(input) {
      return deriveTronAccount(input.mnemonic, input.accountIndex ?? 0);
    },

    async getNativeBalance(input) {
      const rpcBase = normalizeTronRpcUrl(input.rpcUrl);
      const response = await postJson<TronAccountResponse>(`${rpcBase}/wallet/getaccount`, {
        address: tronAddressToHex(input.address),
        visible: false,
      });
      const balanceRaw = BigInt(response.balance ?? 0);

      return {
        ...TRON_NATIVE_ASSET,
        balanceRaw: balanceRaw.toString(),
        balanceFormatted: formatUnits(balanceRaw, 6),
        source: "live_tron_rpc",
      };
    },

    async getTokenBalances() {
      return [];
    },

    getReceiveInfo(input) {
      return {
        family: "tron",
        chainId: TRON_CHAIN_ID,
        address: input.address,
        qrValue: input.address,
        warning: "Send only Tron/TRC-20 assets to this Tron address.",
        explorerUrl: this.buildExplorerAddressUrl(input.address),
      };
    },

    buildExplorerAddressUrl(address) {
      return `https://tronscan.org/#/address/${encodeURIComponent(address)}`;
    },

    buildExplorerTxUrl(txHash) {
      return `https://tronscan.org/#/transaction/${encodeURIComponent(txHash)}`;
    },

    async createSendDraft(input) {
      return createTronSendDraft(input);
    },

    async broadcastTransaction(input) {
      const rpcBase = normalizeTronRpcUrl(undefined);
      const transaction = JSON.parse(input.signedTransaction) as TronTransaction;
      const response = await postJson<TronBroadcastResponse>(
        `${rpcBase}/wallet/broadcasttransaction`,
        transaction,
      );

      if (!response.result) {
        throw new Error(response.message ?? response.code ?? "tron_broadcast_rejected");
      }

      const hash = response.txid ?? transaction.txID;

      if (!hash) {
        throw new Error("tron_broadcast_missing_txid");
      }

      return {
        hash,
        status: "pending",
        explorerUrl: this.buildExplorerTxUrl(hash),
      };
    },

    async broadcastSend(input) {
      return broadcastTronSend(input);
    },
  };
}

export function validateTronAddress(address: string): boolean {
  try {
    const decoded = base58CheckDecode(address);
    return decoded.length === 21 && decoded[0] === TRON_ADDRESS_PREFIX;
  } catch {
    return false;
  }
}

export function deriveTronAccount(mnemonic: string, accountIndex = 0): DerivedAccount {
  if (!validateMnemonic(mnemonic)) {
    throw new Error("invalid_mnemonic");
  }

  const seed = mnemonicToSeedSync(mnemonic);
  const seedBytes = new Uint8Array(seed);
  const path = `${TRON_DERIVATION_PATH_PREFIX}/${accountIndex}`;
  let privateKey: Uint8Array | null = null;

  try {
    const node = HDKey.fromMasterSeed(seedBytes).derive(path);

    if (!node.privateKey) {
      throw new Error("tron_derivation_failed");
    }

    privateKey = new Uint8Array(node.privateKey);
    const address = privateKeyToTronAddress(privateKey);

    return {
      family: "tron",
      chainId: TRON_CHAIN_ID,
      publicAddress: address,
      derivationPath: path,
    };
  } finally {
    wipeBytes(seedBytes);
    wipeBytes(seed);

    if (privateKey) {
      wipeBytes(privateKey);
    }
  }
}

async function createTronSendDraft(input: SendDraftInput): Promise<SendDraft> {
  const issues: SendDraft["issues"] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const amountRaw = normalizeTronAmount(input);
  const isNative = input.asset.type === "native";
  const isTrc20 = input.asset.type === "trc20";

  if (!validateTronAddress(input.fromAddress)) {
    errors.push("Invalid Tron sender address.");
    issues.push({
      code: "invalid_from",
      severity: "error",
      message: "Invalid Tron sender address.",
    });
  }

  if (!validateTronAddress(input.toAddress)) {
    errors.push("Invalid Tron recipient address.");
    issues.push({
      code: "invalid_recipient",
      severity: "error",
      message: "Invalid Tron recipient address.",
    });
  }

  if (!isNative && !isTrc20) {
    errors.push("Only native TRX and TRC-20 transfers are supported by the Tron adapter.");
    issues.push({
      code: "unsupported_asset",
      severity: "error",
      message: "Only native TRX and TRC-20 transfers are supported by the Tron adapter.",
    });
  }

  if (isTrc20 && !input.asset.tokenAddress) {
    errors.push("TRC-20 token address is required.");
    issues.push({
      code: "missing_trc20_contract",
      severity: "error",
      message: "TRC-20 token address is required.",
    });
  }

  if (isTrc20 && input.asset.tokenAddress && !validateTronAddress(input.asset.tokenAddress)) {
    errors.push("Invalid TRC-20 token contract address.");
    issues.push({
      code: "invalid_trc20_contract",
      severity: "error",
      message: "Invalid TRC-20 token contract address.",
    });
  }

  if (amountRaw <= 0n) {
    errors.push("Amount must be greater than zero.");
    issues.push({
      code: "invalid_amount",
      severity: "error",
      message: "Amount must be greater than zero.",
    });
  }

  if (isNative && amountRaw > TRON_MAX_SAFE_RPC_AMOUNT) {
    errors.push("TRX amount is too large for the Tron JSON RPC number field.");
    issues.push({
      code: "amount_too_large",
      severity: "error",
      message: "TRX amount is too large for the Tron JSON RPC number field.",
    });
  }

  if (isTrc20) {
    warnings.push("TRC-20 transfers may burn bandwidth/energy or require TRX for fees.");
  }

  return {
    family: "tron",
    chainId: TRON_CHAIN_ID,
    fromAddress: input.fromAddress,
    toAddress: input.toAddress,
    normalizedToAddress: input.toAddress,
    asset: input.asset,
    amountRaw: amountRaw.toString(),
    amountFormatted: formatUnits(amountRaw, input.asset.decimals),
    supportStatus: errors.length > 0 ? "insufficient_data" : "supported",
    feeEstimate: {
      feeAsset: TRON_NATIVE_ASSET,
      feeRaw: (isTrc20 ? BigInt(TRC20_FEE_LIMIT_SUN) : TRON_NATIVE_FEE_FALLBACK_SUN).toString(),
      feeFormatted: formatUnits(isTrc20 ? BigInt(TRC20_FEE_LIMIT_SUN) : TRON_NATIVE_FEE_FALLBACK_SUN, 6),
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

async function broadcastTronSend(
  input: BroadcastSendInput,
): Promise<SendExecutionResult> {
  const submittedAt = new Date().toISOString();
  const draft = input.draft;
  const rpcBase = normalizeTronRpcUrl(input.rpcUrl);

  try {
    if (!draft.canBroadcast || draft.family !== "tron") {
      throw new Error("invalid_tron_draft");
    }

    const signer = input.mnemonic
      ? deriveTronSignerFromMnemonic(input.mnemonic)
      : deriveTronSignerFromPrivateKey(input.privateKey ?? "");

    try {
      const transaction = draft.asset.type === "trc20"
        ? await createTrc20TransferTransaction(rpcBase, draft)
        : await createNativeTrxTransaction(rpcBase, draft);
      const signed = signTronTransaction(transaction, signer.privateKey);
      const broadcast = await postJson<TronBroadcastResponse>(
        `${rpcBase}/wallet/broadcasttransaction`,
        signed,
      );

      if (!broadcast.result) {
        throw new Error(broadcast.message ?? broadcast.code ?? "tron_broadcast_rejected");
      }

      const txHash = broadcast.txid ?? signed.txID;

      if (!txHash) {
        throw new Error("tron_broadcast_missing_txid");
      }

      return {
        family: "tron",
        chainId: TRON_CHAIN_ID,
        status: "submitted",
        txHash,
        explorerUrl: `https://tronscan.org/#/transaction/${encodeURIComponent(txHash)}`,
        broadcastProvider: rpcBase,
        submittedAt,
      };
    } finally {
      wipeBytes(signer.privateKey);
    }
  } catch (error) {
    return {
      family: "tron",
      chainId: TRON_CHAIN_ID,
      status: "failed",
      txHash: null,
      explorerUrl: null,
      errorCode: "tron_broadcast_failed",
      errorMessage: error instanceof Error ? error.message : "Tron broadcast failed.",
      broadcastProvider: rpcBase,
      submittedAt,
    };
  }
}

function deriveTronSignerFromMnemonic(mnemonic: string): {
  privateKey: Uint8Array;
  address: string;
} {
  if (!validateMnemonic(mnemonic)) {
    throw new Error("invalid_mnemonic");
  }

  const seed = mnemonicToSeedSync(mnemonic);
  const seedBytes = new Uint8Array(seed);

  try {
    const node = HDKey.fromMasterSeed(seedBytes).derive(`${TRON_DERIVATION_PATH_PREFIX}/0`);

    if (!node.privateKey) {
      throw new Error("tron_derivation_failed");
    }

    const privateKey = new Uint8Array(node.privateKey);

    return {
      privateKey,
      address: privateKeyToTronAddress(privateKey),
    };
  } finally {
    wipeBytes(seedBytes);
    wipeBytes(seed);
  }
}

function deriveTronSignerFromPrivateKey(privateKeyHex: string): {
  privateKey: Uint8Array;
  address: string;
} {
  const privateKey = hexToBytes(stripHexPrefix(privateKeyHex));

  if (privateKey.length !== TRON_PRIVATE_KEY_BYTES) {
    throw new Error("invalid_tron_private_key");
  }

  return {
    privateKey,
    address: privateKeyToTronAddress(privateKey),
  };
}

async function createNativeTrxTransaction(
  rpcBase: string,
  draft: SendDraft,
): Promise<TronTransaction> {
  const amount = parsePositiveBigInt(draft.amountRaw, "amount");

  if (amount > TRON_MAX_SAFE_RPC_AMOUNT) {
    throw new Error("trx_amount_too_large");
  }

  const transaction = await postJson<TronCreateTransactionResponse>(
    `${rpcBase}/wallet/createtransaction`,
    {
      owner_address: tronAddressToHex(draft.fromAddress),
      to_address: tronAddressToHex(draft.toAddress),
      amount: Number(amount),
      visible: false,
    },
  );

  if (transaction.Error || transaction.code) {
    throw new Error(transaction.message ?? transaction.Error ?? transaction.code ?? "tron_create_transaction_failed");
  }

  if (!transaction.txID || !transaction.raw_data) {
    throw new Error("tron_create_transaction_missing_payload");
  }

  return transaction;
}

async function createTrc20TransferTransaction(
  rpcBase: string,
  draft: SendDraft,
): Promise<TronTransaction> {
  if (!draft.asset.tokenAddress || !validateTronAddress(draft.asset.tokenAddress)) {
    throw new Error("invalid_trc20_contract");
  }

  const response = await postJson<TronTriggerSmartContractResponse>(
    `${rpcBase}/wallet/triggersmartcontract`,
    {
      owner_address: tronAddressToHex(draft.fromAddress),
      contract_address: tronAddressToHex(draft.asset.tokenAddress),
      function_selector: "transfer(address,uint256)",
      parameter: encodeTrc20TransferParameter(draft.toAddress, draft.amountRaw),
      fee_limit: TRC20_FEE_LIMIT_SUN,
      call_value: 0,
      visible: false,
    },
  );

  if (response.result?.result === false) {
    throw new Error(response.result.message ?? response.result.code ?? "trc20_trigger_failed");
  }

  if (!response.transaction?.txID || !response.transaction.raw_data) {
    throw new Error("trc20_transaction_missing_payload");
  }

  return response.transaction;
}

function signTronTransaction(transaction: TronTransaction, privateKey: Uint8Array): TronTransaction {
  if (!transaction.txID) {
    throw new Error("tron_transaction_missing_txid");
  }

  const digest = hexToBytes(transaction.txID);
  const signature = secp256k1.sign(digest, privateKey, { lowS: true });
  const signatureHex = `${bytesToHex(signatureToCompact(signature))}${recoveryByteHex(signature)}`;

  return {
    ...transaction,
    signature: [signatureHex],
  };
}

function encodeTrc20TransferParameter(toAddress: string, amountRaw: string): string {
  const recipientPayload = tronAddressToHex(toAddress).slice(2);
  const amount = parsePositiveBigInt(amountRaw, "amount");

  return `${leftPadHex(recipientPayload, 64)}${leftPadHex(amount.toString(16), 64)}`;
}

function privateKeyToTronAddress(privateKey: Uint8Array): string {
  const publicKey = secp256k1.getPublicKey(privateKey, false).slice(1);
  const hash = keccak_256(publicKey);
  const payload = new Uint8Array(21);
  payload[0] = TRON_ADDRESS_PREFIX;
  payload.set(hash.slice(-20), 1);
  return base58CheckEncode(payload);
}

function tronAddressToHex(address: string): string {
  const decoded = base58CheckDecode(address);

  if (decoded.length !== 21 || decoded[0] !== TRON_ADDRESS_PREFIX) {
    throw new Error("invalid_tron_address");
  }

  return bytesToHex(decoded);
}

function normalizeTronAmount(input: SendDraftInput): bigint {
  if (input.amountRaw) {
    return parseBigIntSafe(input.amountRaw);
  }

  if (!input.amountFormatted) {
    return 0n;
  }

  return parseDecimalToUnits(input.amountFormatted, input.asset.decimals);
}

function parsePositiveBigInt(value: string, label: string): bigint {
  const parsed = parseBigIntSafe(value);

  if (parsed <= 0n) {
    throw new Error(`invalid_${label}`);
  }

  return parsed;
}

function parseBigIntSafe(value: string): bigint {
  if (!/^[0-9]+$/u.test(value)) {
    return 0n;
  }

  return BigInt(value);
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

function formatUnits(value: bigint, decimals: number): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const scale = 10n ** BigInt(decimals);
  const whole = absolute / scale;
  const fraction = (absolute % scale).toString().padStart(decimals, "0").replace(/0+$/u, "");
  return `${sign}${whole.toString()}${fraction ? `.${fraction}` : ""}`;
}

function base58CheckEncode(payload: Uint8Array): string {
  return base58.encode(concatBytes(payload, checksum(payload)));
}

function base58CheckDecode(value: string): Uint8Array {
  const decoded = base58.decode(value);

  if (decoded.length < 5) {
    throw new Error("invalid_base58check");
  }

  const payload = decoded.slice(0, -4);
  const actualChecksum = decoded.slice(-4);
  const expectedChecksum = checksum(payload);

  if (!constantTimeEqual(actualChecksum, expectedChecksum)) {
    throw new Error("invalid_base58check_checksum");
  }

  return payload;
}

function checksum(payload: Uint8Array): Uint8Array {
  return sha256(sha256(payload)).slice(0, 4);
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < left.length; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return diff === 0;
}

function leftPadHex(value: string, length: number): string {
  if (!/^[0-9a-fA-F]*$/u.test(value) || value.length > length) {
    throw new Error("invalid_hex_padding");
  }

  return value.toLowerCase().padStart(length, "0");
}

function signatureToCompact(signature: unknown): Uint8Array {
  const candidate = signature as {
    toCompactRawBytes?: () => Uint8Array;
    r?: bigint;
    s?: bigint;
  };

  if (typeof candidate.toCompactRawBytes === "function") {
    return candidate.toCompactRawBytes();
  }

  if (typeof candidate.r === "bigint" && typeof candidate.s === "bigint") {
    return concatBytes(bigIntToFixedBytes(candidate.r, 32), bigIntToFixedBytes(candidate.s, 32));
  }

  throw new Error("unsupported_signature_format");
}

function recoveryByteHex(signature: unknown): string {
  const candidate = signature as {
    recovery?: number;
  };
  const recovery = typeof candidate.recovery === "number" && Number.isInteger(candidate.recovery)
    ? candidate.recovery
    : 0;

  return recovery.toString(16).padStart(2, "0");
}

function bigIntToFixedBytes(value: bigint, length: number): Uint8Array {
  const hex = value.toString(16).padStart(length * 2, "0");
  return hexToBytes(hex);
}

function stripHexPrefix(value: string): string {
  return value.startsWith("0x") ? value.slice(2) : value;
}

function hexToBytes(hex: string): Uint8Array {
  const normalized = stripHexPrefix(hex).toLowerCase();

  if (!/^[0-9a-f]*$/u.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error("invalid_hex");
  }

  const output = new Uint8Array(normalized.length / 2);

  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }

  return output;
}

function bytesToHex(value: Uint8Array): string {
  return [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

function normalizeTronRpcUrl(rpcUrl: string | undefined): string {
  return (rpcUrl || DEFAULT_TRON_RPC_URL).replace(/\/+$/u, "");
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`tron_rpc_${response.status}`);
  }

  return response.json() as Promise<T>;
}

import {
  type AssetRef,
  type DerivedAccount,
  type SendDraft,
  type SendDraftInput,
  type SendExecutionResult,
} from "@acorus/shared";
import { bech32 } from "@scure/base";
import { HDKey } from "@scure/bip32";
import { secp256k1 } from "@noble/curves/secp256k1";
import { ripemd160 } from "@noble/hashes/ripemd160";
import { sha256 } from "@noble/hashes/sha256";
import { mnemonicToSeedSync, validateMnemonic } from "bip39";
import { wipeBytes } from "../crypto/vault";
import { type BroadcastSendInput, type ChainAdapter, notImplemented } from "./types";

const BITCOIN_CHAIN_ID = "bitcoin-mainnet";
const DEFAULT_ESPLORA_API = "https://blockstream.info/api";
const DEFAULT_SAT_PER_VBYTE = 6n;
const P2WPKH_DUST_SATS = 546n;
const SIGHASH_ALL = 1;

const BITCOIN_NATIVE_ASSET: AssetRef = {
  family: "utxo",
  chainId: BITCOIN_CHAIN_ID,
  type: "native",
  symbol: "BTC",
  name: "Bitcoin",
  decimals: 8,
  tokenAddress: null,
  logoUrl: null,
  isVerified: true,
};

type EsploraUtxo = {
  txid: string;
  vout: number;
  value: number;
  status?: {
    confirmed?: boolean;
  };
};

type SelectedUtxos = {
  utxos: EsploraUtxo[];
  selectedValue: bigint;
  feeSats: bigint;
  changeSats: bigint;
};

export function createBitcoinAdapter(): ChainAdapter {
  return {
    family: "utxo",
    chainId: BITCOIN_CHAIN_ID,
    name: "Bitcoin",
    nativeAsset: BITCOIN_NATIVE_ASSET,
    capabilities: {
      deriveAccount: true,
      nativeBalance: true,
      tokenBalances: false,
      receive: true,
      sendDraft: true,
      broadcast: true,
      history: false,
      swap: false,
      dapp: false, nft: false,
    },

    validateAddress(address) {
      return validateBitcoinAddress(address);
    },

    deriveAccount(input) {
      return deriveBitcoinAccount(input.mnemonic, input.accountIndex ?? 0);
    },

    async getNativeBalance(input) {
      const apiBase = normalizeEsploraApi(input.rpcUrl);
      const response = await fetchJson<{
        chain_stats?: { funded_txo_sum?: number; spent_txo_sum?: number };
        mempool_stats?: { funded_txo_sum?: number; spent_txo_sum?: number };
      }>(`${apiBase}/address/${encodeURIComponent(input.address)}`);

      const chainFunded = BigInt(response.chain_stats?.funded_txo_sum ?? 0);
      const chainSpent = BigInt(response.chain_stats?.spent_txo_sum ?? 0);
      const mempoolFunded = BigInt(response.mempool_stats?.funded_txo_sum ?? 0);
      const mempoolSpent = BigInt(response.mempool_stats?.spent_txo_sum ?? 0);
      const balanceRaw = chainFunded - chainSpent + mempoolFunded - mempoolSpent;

      return {
        ...BITCOIN_NATIVE_ASSET,
        balanceRaw: balanceRaw.toString(),
        balanceFormatted: formatBtc(balanceRaw),
        source: "live_esplora",
      };
    },

    async getTokenBalances() {
      return [];
    },

    getReceiveInfo(input) {
      return {
        family: "utxo",
        chainId: BITCOIN_CHAIN_ID,
        address: input.address,
        qrValue: `bitcoin:${input.address}`,
        warning: "Send only native BTC to this Bitcoin SegWit address.",
        explorerUrl: this.buildExplorerAddressUrl(input.address),
      };
    },

    buildExplorerAddressUrl(address) {
      return `https://mempool.space/address/${encodeURIComponent(address)}`;
    },

    buildExplorerTxUrl(txHash) {
      return `https://mempool.space/tx/${encodeURIComponent(txHash)}`;
    },

    async createSendDraft(input) {
      return createBitcoinSendDraft(input);
    },

    async broadcastTransaction(input) {
      const apiBase = normalizeEsploraApi(undefined);
      const txHash = await postText(`${apiBase}/tx`, input.signedTransaction);

      return {
        hash: txHash,
        status: "pending",
        explorerUrl: this.buildExplorerTxUrl(txHash),
      };
    },

    async broadcastSend(input) {
      return broadcastBitcoinSend(input);
    },

    async getTransactionHistory() {
      notImplemented("bitcoin_history");
    },

    async getSwapQuote() {
      notImplemented("bitcoin_swap_quote");
    },

    async executeSwap() {
      notImplemented("bitcoin_swap_execute");
    },

    async signMessage() {
      notImplemented("bitcoin_sign_message");
    },

    async signTypedData() {
      notImplemented("bitcoin_sign_typed_data");
    },

    async signTransaction() {
      notImplemented("bitcoin_sign_transaction");
    },
  };
}

export function validateBitcoinAddress(address: string): boolean {
  try {
    const decoded = bech32.decode(address.toLowerCase() as `${string}1${string}`, 90);

    if (decoded.prefix !== "bc") {
      return false;
    }

    const version = decoded.words[0];
    const program = bech32.fromWords(decoded.words.slice(1));

    return version === 0 && program.length === 20 && address.toLowerCase().startsWith("bc1q");
  } catch {
    return false;
  }
}

export function deriveBitcoinAccount(
  mnemonic: string,
  accountIndex = 0,
): DerivedAccount {
  if (!validateMnemonic(mnemonic)) {
    throw new Error("invalid_mnemonic");
  }

  const seed = mnemonicToSeedSync(mnemonic);
  const seedBytes = new Uint8Array(seed);
  const path = `m/84'/0'/0'/0/${accountIndex}`;
  let privateKey: Uint8Array | null = null;

  try {
    const node = HDKey.fromMasterSeed(seedBytes).derive(path);

    if (!node.privateKey || !node.publicKey) {
      throw new Error("bitcoin_derivation_failed");
    }

    privateKey = new Uint8Array(node.privateKey);
    const publicKey = new Uint8Array(node.publicKey);
    const address = encodeP2wpkhAddress(publicKey);

    return {
      family: "utxo",
      chainId: BITCOIN_CHAIN_ID,
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

async function createBitcoinSendDraft(input: SendDraftInput): Promise<SendDraft> {
  const amountRaw = normalizeBitcoinAmount(input);
  const issues: SendDraft["issues"] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!validateBitcoinAddress(input.fromAddress)) {
    errors.push("Invalid Bitcoin sender address.");
    issues.push({
      code: "invalid_from",
      severity: "error",
      message: "Invalid Bitcoin sender address.",
    });
  }

  if (!validateBitcoinAddress(input.toAddress)) {
    errors.push("Invalid Bitcoin recipient address.");
    issues.push({
      code: "invalid_recipient",
      severity: "error",
      message: "Bitcoin sends require a native SegWit bc1q recipient.",
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

  if (input.asset.type !== "native" && input.asset.type !== "utxo") {
    errors.push("Only native BTC transfers are supported by the Bitcoin adapter.");
    issues.push({
      code: "unsupported_asset",
      severity: "error",
      message: "Only native BTC transfers are supported by the Bitcoin adapter.",
    });
  }

  const fallbackFee = estimateBitcoinFee(1, 2, DEFAULT_SAT_PER_VBYTE);

  return {
    family: "utxo",
    chainId: BITCOIN_CHAIN_ID,
    fromAddress: input.fromAddress,
    toAddress: input.toAddress,
    normalizedToAddress: input.toAddress.toLowerCase(),
    asset: BITCOIN_NATIVE_ASSET,
    amountRaw: amountRaw.toString(),
    amountFormatted: formatBtc(amountRaw),
    supportStatus: errors.length > 0 ? "insufficient_data" : "supported",
    feeEstimate: {
      feeAsset: BITCOIN_NATIVE_ASSET,
      feeRaw: fallbackFee.toString(),
      feeFormatted: formatBtc(fallbackFee),
      source: "estimated",
    },
    issues,
    warnings,
    errors,
    canProceed: errors.length === 0,
    canBroadcast: errors.length === 0,
    createdAt: new Date().toISOString(),
  };
}

async function broadcastBitcoinSend(
  input: BroadcastSendInput,
): Promise<SendExecutionResult> {
  const submittedAt = new Date().toISOString();
  const draft = input.draft;
  const apiBase = normalizeEsploraApi(input.rpcUrl);

  try {
    if (!draft.canBroadcast || draft.family !== "utxo") {
      throw new Error("invalid_bitcoin_draft");
    }

    if (!input.mnemonic && !input.privateKey) {
      throw new Error("missing_bitcoin_signer");
    }

    const signer = input.mnemonic
      ? deriveBitcoinSignerFromMnemonic(input.mnemonic)
      : deriveBitcoinSignerFromPrivateKey(input.privateKey ?? "");
    const utxos = await fetchJson<EsploraUtxo[]>(
      `${apiBase}/address/${encodeURIComponent(draft.fromAddress)}/utxo`,
    );
    const amountSats = parsePositiveBigInt(draft.amountRaw, "amount");
    const selection = selectUtxos(utxos, amountSats, DEFAULT_SAT_PER_VBYTE);

    try {
      const rawTx = signP2wpkhTransaction({
        utxos: selection.utxos,
        privateKey: signer.privateKey,
        publicKey: signer.publicKey,
        fromAddress: draft.fromAddress,
        toAddress: draft.toAddress,
        amountSats,
        changeSats: selection.changeSats,
      });
      const txHash = await postText(`${apiBase}/tx`, rawTx);

      return {
        family: "utxo",
        chainId: BITCOIN_CHAIN_ID,
        status: "submitted",
        txHash,
        explorerUrl: `https://mempool.space/tx/${encodeURIComponent(txHash)}`,
        broadcastProvider: apiBase,
        submittedAt,
      };
    } finally {
      wipeBytes(signer.privateKey);
    }
  } catch (error) {
    return {
      family: "utxo",
      chainId: BITCOIN_CHAIN_ID,
      status: "failed",
      txHash: null,
      explorerUrl: null,
      errorCode: "bitcoin_broadcast_failed",
      errorMessage: error instanceof Error ? error.message : "Bitcoin broadcast failed.",
      broadcastProvider: apiBase,
      submittedAt,
    };
  }
}

function deriveBitcoinSignerFromMnemonic(mnemonic: string): {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
} {
  if (!validateMnemonic(mnemonic)) {
    throw new Error("invalid_mnemonic");
  }

  const seed = mnemonicToSeedSync(mnemonic);
  const seedBytes = new Uint8Array(seed);

  try {
    const node = HDKey.fromMasterSeed(seedBytes).derive("m/84'/0'/0'/0/0");

    if (!node.privateKey || !node.publicKey) {
      throw new Error("bitcoin_derivation_failed");
    }

    return {
      privateKey: new Uint8Array(node.privateKey),
      publicKey: new Uint8Array(node.publicKey),
    };
  } finally {
    wipeBytes(seedBytes);
    wipeBytes(seed);
  }
}

function deriveBitcoinSignerFromPrivateKey(privateKeyHex: string): {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
} {
  const privateKey = hexToBytes(stripHexPrefix(privateKeyHex));

  if (privateKey.length !== 32) {
    throw new Error("invalid_bitcoin_private_key");
  }

  return {
    privateKey,
    publicKey: secp256k1.getPublicKey(privateKey, true),
  };
}

function signP2wpkhTransaction(input: {
  utxos: EsploraUtxo[];
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  fromAddress: string;
  toAddress: string;
  amountSats: bigint;
  changeSats: bigint;
}): string {
  const fromProgram = decodeP2wpkhProgram(input.fromAddress);
  const outputs = [
    serializeOutput(input.amountSats, p2wpkhScriptPubKey(decodeP2wpkhProgram(input.toAddress))),
  ];

  if (input.changeSats >= P2WPKH_DUST_SATS) {
    outputs.push(serializeOutput(input.changeSats, p2wpkhScriptPubKey(fromProgram)));
  }

  const hashPrevouts = sha256d(concatBytes(...input.utxos.map((utxo) => (
    concatBytes(reverseBytes(hexToBytes(utxo.txid)), uint32LE(utxo.vout))
  ))));
  const hashSequence = sha256d(concatBytes(...input.utxos.map(() => uint32LE(0xffff_ffff))));
  const hashOutputs = sha256d(concatBytes(...outputs));
  const scriptCode = concatBytes(
    new Uint8Array([0x19, 0x76, 0xa9, 0x14]),
    fromProgram,
    new Uint8Array([0x88, 0xac]),
  );
  const witnesses: Uint8Array[][] = [];

  for (const utxo of input.utxos) {
    const preimage = concatBytes(
      uint32LE(2),
      hashPrevouts,
      hashSequence,
      reverseBytes(hexToBytes(utxo.txid)),
      uint32LE(utxo.vout),
      scriptCode,
      uint64LE(BigInt(utxo.value)),
      uint32LE(0xffff_ffff),
      hashOutputs,
      uint32LE(0),
      uint32LE(SIGHASH_ALL),
    );
    const signature = signatureToDer(secp256k1.sign(sha256d(preimage), input.privateKey, { lowS: true }));
    const signatureWithHashType = concatBytes(signature, new Uint8Array([SIGHASH_ALL]));
    witnesses.push([signatureWithHashType, input.publicKey]);
  }

  const inputs = input.utxos.map((utxo) => concatBytes(
    reverseBytes(hexToBytes(utxo.txid)),
    uint32LE(utxo.vout),
    new Uint8Array([0x00]),
    uint32LE(0xffff_ffff),
  ));

  const rawTx = concatBytes(
    uint32LE(2),
    new Uint8Array([0x00, 0x01]),
    encodeVarInt(input.utxos.length),
    ...inputs,
    encodeVarInt(outputs.length),
    ...outputs,
    ...witnesses.map(serializeWitness),
    uint32LE(0),
  );

  return bytesToHex(rawTx);
}

function selectUtxos(
  utxos: EsploraUtxo[],
  amountSats: bigint,
  satPerVbyte: bigint,
): SelectedUtxos {
  const confirmed = utxos
    .filter((utxo) => utxo.status?.confirmed !== false && utxo.value > 0)
    .sort((left, right) => right.value - left.value);
  const selected: EsploraUtxo[] = [];
  let total = 0n;

  for (const utxo of confirmed) {
    selected.push(utxo);
    total += BigInt(utxo.value);

    const feeWithChange = estimateBitcoinFee(selected.length, 2, satPerVbyte);

    if (total >= amountSats + feeWithChange) {
      const change = total - amountSats - feeWithChange;

      if (change >= P2WPKH_DUST_SATS) {
        return {
          utxos: selected,
          selectedValue: total,
          feeSats: feeWithChange,
          changeSats: change,
        };
      }

      const feeNoChange = estimateBitcoinFee(selected.length, 1, satPerVbyte);

      if (total >= amountSats + feeNoChange) {
        return {
          utxos: selected,
          selectedValue: total,
          feeSats: feeNoChange,
          changeSats: 0n,
        };
      }
    }
  }

  throw new Error("insufficient_bitcoin_utxos");
}

function estimateBitcoinFee(inputCount: number, outputCount: number, satPerVbyte: bigint): bigint {
  return BigInt(10 + inputCount * 68 + outputCount * 31) * satPerVbyte;
}

function normalizeBitcoinAmount(input: SendDraftInput): bigint {
  if (input.amountRaw) {
    return parseBigIntSafe(input.amountRaw);
  }

  if (!input.amountFormatted) {
    return 0n;
  }

  return parseDecimalToUnits(input.amountFormatted, 8);
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

function formatBtc(sats: bigint): string {
  const sign = sats < 0n ? "-" : "";
  const absolute = sats < 0n ? -sats : sats;
  const whole = absolute / 100_000_000n;
  const fraction = (absolute % 100_000_000n).toString().padStart(8, "0").replace(/0+$/u, "");
  return `${sign}${whole.toString()}${fraction ? `.${fraction}` : ""}`;
}

function encodeP2wpkhAddress(publicKey: Uint8Array): string {
  const program = hash160(publicKey);
  return bech32.encode("bc", [0, ...bech32.toWords(program)], 90);
}

function decodeP2wpkhProgram(address: string): Uint8Array {
  const decoded = bech32.decode(address.toLowerCase() as `${string}1${string}`, 90);
  const program = bech32.fromWords(decoded.words.slice(1));

  if (decoded.prefix !== "bc" || decoded.words[0] !== 0 || program.length !== 20) {
    throw new Error("invalid_p2wpkh_address");
  }

  return new Uint8Array(program);
}

function hash160(value: Uint8Array): Uint8Array {
  return ripemd160(sha256(value));
}

function p2wpkhScriptPubKey(program: Uint8Array): Uint8Array {
  return concatBytes(new Uint8Array([0x00, 0x14]), program);
}

function serializeOutput(value: bigint, scriptPubKey: Uint8Array): Uint8Array {
  return concatBytes(
    uint64LE(value),
    encodeVarInt(scriptPubKey.length),
    scriptPubKey,
  );
}

function serializeWitness(items: Uint8Array[]): Uint8Array {
  return concatBytes(
    encodeVarInt(items.length),
    ...items.map((item) => concatBytes(encodeVarInt(item.length), item)),
  );
}

function encodeVarInt(value: number): Uint8Array {
  if (value < 0xfd) {
    return new Uint8Array([value]);
  }

  if (value <= 0xffff) {
    return concatBytes(new Uint8Array([0xfd]), uint16LE(value));
  }

  return concatBytes(new Uint8Array([0xfe]), uint32LE(value));
}

function uint16LE(value: number): Uint8Array {
  const output = new Uint8Array(2);
  const view = new DataView(output.buffer);
  view.setUint16(0, value, true);
  return output;
}

function uint32LE(value: number): Uint8Array {
  const output = new Uint8Array(4);
  const view = new DataView(output.buffer);
  view.setUint32(0, value, true);
  return output;
}

function uint64LE(value: bigint): Uint8Array {
  const output = new Uint8Array(8);
  const view = new DataView(output.buffer);
  view.setBigUint64(0, value, true);
  return output;
}

function sha256d(value: Uint8Array): Uint8Array {
  return sha256(sha256(value));
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

function reverseBytes(value: Uint8Array): Uint8Array {
  return new Uint8Array(value).reverse();
}

function signatureToDer(signature: unknown): Uint8Array {
  const candidate = signature as {
    toDERRawBytes?: () => Uint8Array;
    toDERHex?: () => string;
  };

  if (typeof candidate.toDERRawBytes === "function") {
    return candidate.toDERRawBytes();
  }

  if (typeof candidate.toDERHex === "function") {
    return hexToBytes(candidate.toDERHex());
  }

  throw new Error("unsupported_signature_format");
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

function normalizeEsploraApi(rpcUrl: string | undefined): string {
  return (rpcUrl || DEFAULT_ESPLORA_API).replace(/\/+$/u, "");
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`bitcoin_rpc_${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function postText(url: string, body: string): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "text/plain",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`bitcoin_broadcast_${response.status}`);
  }

  return response.text();
}

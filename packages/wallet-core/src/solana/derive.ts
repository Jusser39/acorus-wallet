import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import {
  isImportableWalletMnemonic,
  normalizeWalletMnemonic,
} from "../mnemonic";

export const SOLANA_DERIVATION_PATH = "m/44'/501'/0'/0'";

export type SolanaAccount = {
  publicAddress: string;
  derivationPath: string;
};

export function deriveSolanaKeypairFromMnemonic(input: {
  mnemonic: string;
  derivationPath?: string;
}): Keypair {
  const mnemonic = normalizeWalletMnemonic(input.mnemonic);

  if (!isImportableWalletMnemonic(mnemonic)) {
    throw new Error("invalid_mnemonic");
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const derivationPath = input.derivationPath ?? SOLANA_DERIVATION_PATH;
  const derivedSeed = derivePath(derivationPath, bytesToHex(seed)).key;
  const secretKey = nacl.sign.keyPair.fromSeed(derivedSeed).secretKey;

  return Keypair.fromSecretKey(secretKey);
}

export function deriveSolanaAccountFromMnemonic(input: {
  mnemonic: string;
  derivationPath?: string;
}): SolanaAccount {
  const derivationPath = input.derivationPath ?? SOLANA_DERIVATION_PATH;
  const keypair = deriveSolanaKeypairFromMnemonic({
    mnemonic: input.mnemonic,
    derivationPath,
  });

  return {
    publicAddress: keypair.publicKey.toBase58(),
    derivationPath,
  };
}

export function deriveSolanaAddressFromMnemonic(input: {
  mnemonic: string;
  derivationPath?: string;
}): SolanaAccount {
  return deriveSolanaAccountFromMnemonic(input);
}

export function getSolanaAddressFromMnemonic(mnemonic: string): string {
  return deriveSolanaAccountFromMnemonic({ mnemonic }).publicAddress;
}

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address.trim());
    return true;
  } catch {
    return false;
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

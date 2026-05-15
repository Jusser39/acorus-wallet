import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

export const SOLANA_DERIVATION_PATH = "m/44'/501'/0'/0'";

export type SolanaAccount = {
  publicAddress: string;
  derivationPath: string;
};

export function deriveSolanaKeypairFromMnemonic(input: {
  mnemonic: string;
  derivationPath?: string;
}): Keypair {
  const mnemonic = input.mnemonic.trim().toLowerCase();

  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error("invalid_mnemonic");
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const derivationPath = input.derivationPath ?? SOLANA_DERIVATION_PATH;
  const derivedSeed = derivePath(derivationPath, seed.toString("hex")).key;
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

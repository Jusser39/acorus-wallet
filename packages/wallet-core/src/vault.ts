import { encryptedVaultSchema, walletVaultPlaintextSchema } from "./schemas";
import { asArrayBuffer, decodeUtf8, encodeUtf8 } from "./encoding";
import {
  decryptVaultPayload,
  encryptVaultPayload,
  wipeBytes,
} from "./crypto/vault";
import type { EncryptedVaultV1, WalletVaultPlaintext } from "./types";

export async function encryptVault(
  plaintext: WalletVaultPlaintext,
  passcode: string,
): Promise<EncryptedVaultV1> {
  const parsed = walletVaultPlaintextSchema.parse(plaintext);
  const plaintextBytes = encodeUtf8(JSON.stringify(parsed));

  try {
    return await encryptVaultPayload(plaintextBytes, passcode);
  } finally {
    wipeBytes(plaintextBytes);
  }
}

export function parseEncryptedVault(vault: unknown): EncryptedVaultV1 {
  if (
    typeof vault === "object" &&
    vault !== null &&
    "version" in vault &&
    (vault as { version?: unknown }).version !== 1
  ) {
    throw new Error("Unsupported vault version.");
  }

  return encryptedVaultSchema.parse(vault);
}

export async function decryptVault(
  vault: EncryptedVaultV1,
  passcode: string,
): Promise<WalletVaultPlaintext> {
  const parsed = parseEncryptedVault(vault);
  let plaintext: Uint8Array | null = null;

  try {
    plaintext = await decryptVaultPayload(parsed, passcode);

    return walletVaultPlaintextSchema.parse(JSON.parse(decodeUtf8(asArrayBuffer(plaintext))));
  } catch {
    throw new Error("Unable to unlock wallet with the provided passcode.");
  } finally {
    wipeBytes(plaintext);
  }
}

export function clearSensitiveMemoryBestEffort(
  vault: Partial<WalletVaultPlaintext> | null | undefined,
): null {
  if (vault) {
    vault.mnemonic = "";
    vault.evmAddress = "" as WalletVaultPlaintext["evmAddress"];
    vault.createdAt = "";
  }

  return null;
}

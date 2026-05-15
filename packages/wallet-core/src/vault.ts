import { encryptedVaultSchema, walletVaultPlaintextSchema } from "./schemas";
import {
  asArrayBuffer,
  base64ToBytes,
  bytesToBase64,
  decodeUtf8,
  encodeUtf8,
} from "./encoding";
import type { EncryptedVaultV1, WalletVaultPlaintext } from "./types";

const PBKDF2_ITERATIONS = 310_000;

async function importPasscodeKey(passcode: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    asArrayBuffer(encodeUtf8(passcode)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
}

async function deriveAesKey(
  passcode: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const baseKey = await importPasscodeKey(passcode);

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations,
      salt: asArrayBuffer(salt),
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptVault(
  plaintext: WalletVaultPlaintext,
  passcode: string,
): Promise<EncryptedVaultV1> {
  const parsed = walletVaultPlaintextSchema.parse(plaintext);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passcode, salt, PBKDF2_ITERATIONS);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    asArrayBuffer(encodeUtf8(JSON.stringify(parsed))),
  );

  return {
    version: 1,
    kdf: "pbkdf2-sha256",
    iterations: PBKDF2_ITERATIONS,
    saltBase64: bytesToBase64(salt),
    ivBase64: bytesToBase64(iv),
    ciphertextBase64: bytesToBase64(new Uint8Array(ciphertext)),
    createdAt: new Date().toISOString(),
  };
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
  const salt = base64ToBytes(parsed.saltBase64);
  const iv = base64ToBytes(parsed.ivBase64);
  const ciphertext = base64ToBytes(parsed.ciphertextBase64);
  const key = await deriveAesKey(passcode, salt, parsed.iterations);

  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: asArrayBuffer(iv),
      },
      key,
      asArrayBuffer(ciphertext),
    );

    return walletVaultPlaintextSchema.parse(JSON.parse(decodeUtf8(plaintext)));
  } catch {
    throw new Error("Unable to unlock wallet with the provided passcode.");
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

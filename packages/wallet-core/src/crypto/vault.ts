import type { EncryptedVaultV1 } from "../types";
import {
  asArrayBuffer,
  base64ToBytes,
  bytesToBase64,
  encodeUtf8,
} from "../encoding";

export const VAULT_PBKDF2_ITERATIONS = 600_000;
export const VAULT_SALT_BYTES = 16;
export const VAULT_AES_GCM_IV_BYTES = 12;

export function getVaultCrypto(): Crypto {
  const vaultCrypto = globalThis.crypto;

  if (!vaultCrypto?.subtle || !vaultCrypto.getRandomValues) {
    throw new Error(
      "Secure browser crypto is unavailable. Open Acorus Wallet over HTTPS before creating, importing, or unlocking a wallet.",
    );
  }

  return vaultCrypto;
}

export function secureRandomBytes(byteLength: number): Uint8Array {
  if (!Number.isSafeInteger(byteLength) || byteLength <= 0) {
    throw new Error("Invalid secure random byte length.");
  }

  return getVaultCrypto().getRandomValues(new Uint8Array(byteLength));
}

export function wipeBytes(bytes: Uint8Array | null | undefined): void {
  if (bytes) {
    bytes.fill(0);
  }
}

async function importPasscodeKey(passcode: string): Promise<CryptoKey> {
  const passcodeBytes = encodeUtf8(passcode);

  try {
    return await getVaultCrypto().subtle.importKey(
      "raw",
      asArrayBuffer(passcodeBytes),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
  } finally {
    wipeBytes(passcodeBytes);
  }
}

export async function deriveVaultAesKey(
  passcode: string,
  salt: Uint8Array,
  iterations = VAULT_PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  if (salt.byteLength !== VAULT_SALT_BYTES) {
    throw new Error("Invalid vault salt length.");
  }

  if (iterations !== VAULT_PBKDF2_ITERATIONS) {
    throw new Error("Vault PBKDF2 iteration count must be exactly 600000.");
  }

  const baseKey = await importPasscodeKey(passcode);

  return getVaultCrypto().subtle.deriveKey(
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

export async function encryptVaultPayload(
  plaintextBytes: Uint8Array,
  passcode: string,
): Promise<EncryptedVaultV1> {
  if (plaintextBytes.byteLength === 0) {
    throw new Error("Cannot encrypt an empty wallet vault payload.");
  }

  const salt = secureRandomBytes(VAULT_SALT_BYTES);
  const iv = secureRandomBytes(VAULT_AES_GCM_IV_BYTES);

  try {
    const key = await deriveVaultAesKey(
      passcode,
      salt,
      VAULT_PBKDF2_ITERATIONS,
    );
    const encrypted = await getVaultCrypto().subtle.encrypt(
      {
        name: "AES-GCM",
        iv: asArrayBuffer(iv),
      },
      key,
      asArrayBuffer(plaintextBytes),
    );
    const ciphertext = new Uint8Array(encrypted);

    try {
      return {
        version: 1,
        kdf: "pbkdf2-sha256",
        iterations: VAULT_PBKDF2_ITERATIONS,
        saltBase64: bytesToBase64(salt),
        ivBase64: bytesToBase64(iv),
        ciphertextBase64: bytesToBase64(ciphertext),
        createdAt: new Date().toISOString(),
      };
    } finally {
      wipeBytes(ciphertext);
    }
  } finally {
    wipeBytes(salt);
    wipeBytes(iv);
  }
}

export async function decryptVaultPayload(
  vault: EncryptedVaultV1,
  passcode: string,
): Promise<Uint8Array> {
  const salt = base64ToBytes(vault.saltBase64);
  const iv = base64ToBytes(vault.ivBase64);
  const ciphertext = base64ToBytes(vault.ciphertextBase64);

  try {
    if (iv.byteLength !== VAULT_AES_GCM_IV_BYTES) {
      throw new Error("Invalid vault IV length.");
    }

    const key = await deriveVaultAesKey(passcode, salt, vault.iterations);
    const plaintext = await getVaultCrypto().subtle.decrypt(
      {
        name: "AES-GCM",
        iv: asArrayBuffer(iv),
      },
      key,
      asArrayBuffer(ciphertext),
    );

    return new Uint8Array(plaintext);
  } finally {
    wipeBytes(salt);
    wipeBytes(iv);
    wipeBytes(ciphertext);
  }
}

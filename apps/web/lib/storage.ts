import { parseEncryptedVault, type EncryptedVaultV1 } from "@acorus/wallet-core";
import {
  ACTIVE_PROFILE_ID_KEY,
  DEFAULT_AUTOLOCK_MINUTES,
  DEFAULT_SAFETY_MODE,
  ENCRYPTED_VAULT_KEY,
  SETTINGS_KEY,
  USER_ID_KEY,
  VAULT_META_KEY,
} from "./constants";

export interface LocalSettings {
  autoLockMinutes: number;
  safetyMode: boolean;
}

export interface VaultMeta {
  version: 1;
  createdAt: string;
  passcodeInitialized: boolean;
}

const LEGACY_SESSION_KEYS = [
  "acorus.session.mnemonic",
  "acorus.session.passcode",
  "acorus.session.unlockedVault",
] as const;

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function loadEncryptedVault(): EncryptedVaultV1 | null {
  const storage = getStorage();
  const raw = storage?.getItem(ENCRYPTED_VAULT_KEY);

  if (!raw) {
    return null;
  }

  try {
    return parseEncryptedVault(JSON.parse(raw) as unknown);
  } catch (error) {
    if (error instanceof Error && error.message === "Unsupported vault version.") {
      throw error;
    }

    throw new Error("Stored vault is corrupted.");
  }
}

export function saveEncryptedVault(vault: EncryptedVaultV1): void {
  const storage = getStorage();
  storage?.setItem(ENCRYPTED_VAULT_KEY, JSON.stringify(vault));
  storage?.setItem(
    VAULT_META_KEY,
    JSON.stringify({
      version: 1,
      createdAt: vault.createdAt,
      passcodeInitialized: true,
    } satisfies VaultMeta),
  );
}

export function hasVault(): boolean {
  return Boolean(getStorage()?.getItem(ENCRYPTED_VAULT_KEY));
}

export function clearEncryptedVault(): void {
  const storage = getStorage();
  storage?.removeItem(ENCRYPTED_VAULT_KEY);
  storage?.removeItem(VAULT_META_KEY);
}

export function loadVaultMeta(): VaultMeta | null {
  const raw = getStorage()?.getItem(VAULT_META_KEY);

  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw) as Partial<VaultMeta>;

  if (
    parsed.version !== 1
    || typeof parsed.createdAt !== "string"
    || typeof parsed.passcodeInitialized !== "boolean"
  ) {
    return null;
  }

  return {
    version: 1,
    createdAt: parsed.createdAt,
    passcodeInitialized: parsed.passcodeInitialized,
  };
}

export function loadUserId(): string | null {
  return getStorage()?.getItem(USER_ID_KEY) ?? null;
}

export function saveUserId(userId: string): void {
  getStorage()?.setItem(USER_ID_KEY, userId);
}

export function loadActiveWalletProfileId(): string | null {
  return getStorage()?.getItem(ACTIVE_PROFILE_ID_KEY) ?? null;
}

export function saveActiveWalletProfileId(id: string | null): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  if (!id) {
    storage.removeItem(ACTIVE_PROFILE_ID_KEY);
    return;
  }

  storage.setItem(ACTIVE_PROFILE_ID_KEY, id);
}

export const loadActiveProfileId = loadActiveWalletProfileId;
export const saveActiveProfileId = saveActiveWalletProfileId;

export function loadLocalSettings(): LocalSettings {
  const raw = getStorage()?.getItem(SETTINGS_KEY);

  if (!raw) {
    return {
      autoLockMinutes: DEFAULT_AUTOLOCK_MINUTES,
      safetyMode: DEFAULT_SAFETY_MODE,
    };
  }

  const parsed = JSON.parse(raw) as Partial<LocalSettings>;
  return {
    autoLockMinutes: parsed.autoLockMinutes ?? DEFAULT_AUTOLOCK_MINUTES,
    safetyMode: parsed.safetyMode ?? DEFAULT_SAFETY_MODE,
  };
}

export function saveLocalSettings(settings: LocalSettings): void {
  getStorage()?.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function clearSessionDecryptedState(): void {
  const storage = getStorage();

  for (const key of LEGACY_SESSION_KEYS) {
    storage?.removeItem(key);
  }
}

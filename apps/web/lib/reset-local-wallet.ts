import {
  ACTIVE_PROFILE_ID_KEY,
  ENCRYPTED_VAULT_KEY,
  SETTINGS_KEY,
  USER_ID_KEY,
  VAULT_META_KEY,
} from "./constants";

const WALLET_STORAGE_PREFIXES = [
  "acorus_wallet",
  "acorus:vault",
  "acorus_vault",
  "wallet_vault",
  "practice_wallet",
] as const;

const WALLET_STORAGE_EXACT_KEYS = [
  ENCRYPTED_VAULT_KEY,
  VAULT_META_KEY,
  USER_ID_KEY,
  ACTIVE_PROFILE_ID_KEY,
  SETTINGS_KEY,
  "acorus.session.mnemonic",
  "acorus.session.passcode",
  "acorus.session.unlockedVault",
] as const;

function getDefaultStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function clearAcorusLocalWalletState(
  storage: Storage | null = getDefaultStorage(),
): string[] {
  if (!storage) {
    return [];
  }

  const removed: string[] = [];
  const exact = new Set<string>(WALLET_STORAGE_EXACT_KEYS);

  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);

    if (!key) {
      continue;
    }

    const shouldRemove =
      exact.has(key)
      || WALLET_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));

    if (shouldRemove) {
      storage.removeItem(key);
      removed.push(key);
    }
  }

  return removed;
}

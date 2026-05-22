export const ENCRYPTED_VAULT_KEY = "acorus.encryptedVault";
export const VAULT_META_KEY = "acorus.vaultMeta";
export const USER_ID_KEY = "acorus.userId";
export const ACTIVE_PROFILE_ID_KEY = "acorus.activeProfileId";
export const SETTINGS_KEY = "acorus.settings";

export const DEFAULT_AUTOLOCK_MINUTES = Number(
  process.env.NEXT_PUBLIC_DEFAULT_AUTOLOCK_MINUTES ?? "10",
);

export const DEFAULT_SAFETY_MODE =
  process.env.NEXT_PUBLIC_DEFAULT_SAFETY_MODE !== "false";

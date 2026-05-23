export type WalletVaultRepairReason =
  | "corrupted_vault"
  | "missing_meta"
  | "legacy_unknown"
  | "profiles_missing"
  | "passcode_not_initialized"
  | "local_profile_without_vault";

export type WalletVaultUiState =
  | {
      kind: "empty";
      reason: "no_vault";
    }
  | {
      kind: "locked";
      reason: "valid_encrypted_vault";
      walletName?: string | null;
      lastUnlockedAt?: string | null;
    }
  | {
      kind: "unlocked";
      reason: "active_session";
      walletName?: string | null;
    }
  | {
      kind: "repair_required";
      reason: WalletVaultRepairReason;
      message: string;
    };

export function resolveWalletVaultUiState(input: {
  hasEncryptedVault: boolean;
  encryptedVaultVersion?: number | null;
  hasVaultMeta?: boolean;
  profileCount?: number;
  hasLocalProfile?: boolean;
  isUnlocked: boolean;
  passcodeInitialized?: boolean;
  walletName?: string | null;
  lastUnlockedAt?: string | null;
  vaultReadError?: string | null;
}): WalletVaultUiState {
  if (input.vaultReadError) {
    return {
      kind: "repair_required",
      reason: "corrupted_vault",
      message:
        "Local wallet data could not be read. Reset local wallet state or import your seed phrase again.",
    };
  }

  if (!input.hasEncryptedVault) {
    if (input.hasLocalProfile) {
      return {
        kind: "repair_required",
        reason: "local_profile_without_vault",
        message:
          "A local wallet profile exists, but no encrypted vault was found on this device.",
      };
    }

    return { kind: "empty", reason: "no_vault" };
  }

  if (
    input.encryptedVaultVersion !== undefined
    && input.encryptedVaultVersion !== null
    && input.encryptedVaultVersion !== 1
  ) {
    return {
      kind: "repair_required",
      reason: "legacy_unknown",
      message: "This wallet vault version is not supported by the current app.",
    };
  }

  if (input.hasVaultMeta === false) {
    return {
      kind: "repair_required",
      reason: "missing_meta",
      message:
        "Local wallet metadata is missing. Reset local wallet state or import your seed phrase again.",
    };
  }

  if (input.passcodeInitialized !== true) {
    return {
      kind: "repair_required",
      reason: "passcode_not_initialized",
      message:
        "A local wallet lock was found, but no passcode setup marker exists.",
    };
  }

  if ((input.profileCount ?? 1) <= 0) {
    return {
      kind: "repair_required",
      reason: "profiles_missing",
      message: "The local wallet exists, but no wallet profiles were found.",
    };
  }

  if (input.isUnlocked) {
    return {
      kind: "unlocked",
      reason: "active_session",
      walletName: input.walletName,
    };
  }

  return {
    kind: "locked",
    reason: "valid_encrypted_vault",
    walletName: input.walletName,
    lastUnlockedAt: input.lastUnlockedAt,
  };
}

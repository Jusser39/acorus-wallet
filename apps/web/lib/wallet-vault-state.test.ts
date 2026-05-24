import { describe, expect, it } from "vitest";
import { resolveWalletVaultUiState } from "./wallet-vault-state";

describe("resolveWalletVaultUiState", () => {
  it("shows empty onboarding when no vault exists", () => {
    expect(
      resolveWalletVaultUiState({
        hasEncryptedVault: false,
        isUnlocked: false,
      }).kind,
    ).toBe("empty");
  });

  it("does not show keypad when a local profile exists without a vault", () => {
    const state = resolveWalletVaultUiState({
      hasEncryptedVault: false,
      hasLocalProfile: true,
      profileCount: 1,
      isUnlocked: false,
    });

    expect(state.kind).toBe("repair_required");
    expect(state.reason).toBe("local_profile_without_vault");
  });

  it("does not show keypad when passcode marker is explicitly missing", () => {
    const state = resolveWalletVaultUiState({
      hasEncryptedVault: true,
      hasVaultMeta: true,
      encryptedVaultVersion: 1,
      profileCount: 1,
      isUnlocked: false,
      passcodeInitialized: false,
    });

    expect(state.kind).toBe("repair_required");
    expect(state.reason).toBe("passcode_not_initialized");
  });

  it("shows locked only for a valid initialized vault", () => {
    expect(
      resolveWalletVaultUiState({
        hasEncryptedVault: true,
        hasVaultMeta: true,
        encryptedVaultVersion: 1,
        profileCount: 1,
        isUnlocked: false,
        passcodeInitialized: true,
        passcodeSetupConfirmedAt: "2026-05-24T00:00:00.000Z",
      }).kind,
    ).toBe("locked");
  });

  it("does not show keypad when the explicit passcode setup marker is missing", () => {
    const state = resolveWalletVaultUiState({
      hasEncryptedVault: true,
      hasVaultMeta: true,
      encryptedVaultVersion: 1,
      profileCount: 1,
      isUnlocked: false,
      passcodeInitialized: true,
    });

    expect(state.kind).toBe("repair_required");
    expect(state.reason).toBe("passcode_not_initialized");
  });

  it("requires repair when encrypted vault metadata is absent", () => {
    const state = resolveWalletVaultUiState({
      hasEncryptedVault: true,
      hasVaultMeta: false,
      encryptedVaultVersion: 1,
      profileCount: 1,
      isUnlocked: false,
      passcodeInitialized: undefined,
    });

    expect(state.kind).toBe("repair_required");
    expect(state.reason).toBe("missing_meta");
  });

  it("requires repair when passcode marker is unknown", () => {
    const state = resolveWalletVaultUiState({
      hasEncryptedVault: true,
      hasVaultMeta: true,
      encryptedVaultVersion: 1,
      profileCount: 1,
      isUnlocked: false,
      passcodeInitialized: undefined,
    });

    expect(state.kind).toBe("repair_required");
    expect(state.reason).toBe("passcode_not_initialized");
  });

  it("shows unlocked when session is active", () => {
    expect(
      resolveWalletVaultUiState({
        hasEncryptedVault: true,
        hasVaultMeta: true,
        encryptedVaultVersion: 1,
        profileCount: 1,
        isUnlocked: true,
        passcodeInitialized: true,
        passcodeSetupConfirmedAt: "2026-05-24T00:00:00.000Z",
      }).kind,
    ).toBe("unlocked");
  });
});

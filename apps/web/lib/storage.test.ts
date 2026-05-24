import { beforeEach, describe, expect, it } from "vitest";
import {
  clearEncryptedVault,
  clearSessionDecryptedState,
  hasVault,
  loadEncryptedVault,
  loadLocalSettings,
  loadUserId,
  loadVaultMeta,
  saveEncryptedVault,
  saveLocalSettings,
  saveUserId,
} from "./storage";

describe("storage helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores encrypted vault only as serialized payload", () => {
    saveEncryptedVault(
      {
        version: 1,
        kdf: "pbkdf2-sha256",
        iterations: 1,
        saltBase64: "salt",
        ivBase64: "iv",
        ciphertextBase64: "cipher",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      { passcodeMode: "pin" },
    );

    expect(loadEncryptedVault()?.ciphertextBase64).toBe("cipher");
    expect(loadVaultMeta()).toEqual({
      version: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      passcodeInitialized: true,
      passcodeMode: "pin",
      passcodeSetupConfirmedAt: expect.any(String),
    });
    expect(hasVault()).toBe(true);
    expect(window.localStorage.getItem("acorus.encryptedVault")).toContain("cipher");

    clearEncryptedVault();
    expect(loadEncryptedVault()).toBeNull();
    expect(loadVaultMeta()).toBeNull();
    expect(hasVault()).toBe(false);
  });

  it("persists user id and settings", () => {
    saveUserId("user-1");
    saveLocalSettings({
      autoLockMinutes: 15,
      safetyMode: false,
      theme: "dark",
      displayCurrency: "JPY",
      preferredLanguage: "ja",
      analyticsEnabled: true,
      hideSmallBalances: false,
      hideUnknownTokens: false,
      hideFlaggedActivity: false,
    });

    expect(loadUserId()).toBe("user-1");
    expect(loadLocalSettings()).toEqual({
      autoLockMinutes: 15,
      safetyMode: false,
      theme: "dark",
      displayCurrency: "JPY",
      preferredLanguage: "ja",
      analyticsEnabled: true,
      hideSmallBalances: false,
      hideUnknownTokens: false,
      hideFlaggedActivity: false,
    });
  });

  it("falls back to default settings when stored JSON is corrupted", () => {
    window.localStorage.setItem("acorus.settings", "{broken");

    expect(loadLocalSettings()).toMatchObject({
      autoLockMinutes: 10,
      safetyMode: true,
      displayCurrency: "USD",
      preferredLanguage: "ru",
    });
  });

  it("clears any legacy decrypted session keys", () => {
    window.localStorage.setItem("acorus.session.mnemonic", "test");
    window.localStorage.setItem("acorus.session.passcode", "123456");

    clearSessionDecryptedState();

    expect(window.localStorage.getItem("acorus.session.mnemonic")).toBeNull();
    expect(window.localStorage.getItem("acorus.session.passcode")).toBeNull();
  });

  it("rejects unsupported vault versions", () => {
    window.localStorage.setItem(
      "acorus.encryptedVault",
      JSON.stringify({
        version: 2,
        kdf: "pbkdf2-sha256",
        iterations: 1,
        saltBase64: "salt",
        ivBase64: "iv",
        ciphertextBase64: "cipher",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );

    expect(() => loadEncryptedVault()).toThrow("Unsupported vault version.");
  });
});

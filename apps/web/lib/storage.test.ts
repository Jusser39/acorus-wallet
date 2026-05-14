import { beforeEach, describe, expect, it } from "vitest";
import {
  clearEncryptedVault,
  loadEncryptedVault,
  loadLocalSettings,
  loadUserId,
  saveEncryptedVault,
  saveLocalSettings,
  saveUserId,
} from "./storage";

describe("storage helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores encrypted vault only as serialized payload", () => {
    saveEncryptedVault({
      version: 1,
      kdf: "pbkdf2-sha256",
      iterations: 1,
      saltBase64: "salt",
      ivBase64: "iv",
      ciphertextBase64: "cipher",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    expect(loadEncryptedVault()?.ciphertextBase64).toBe("cipher");
    expect(window.localStorage.getItem("acorus.encryptedVault")).toContain("cipher");

    clearEncryptedVault();
    expect(loadEncryptedVault()).toBeNull();
  });

  it("persists user id and settings", () => {
    saveUserId("user-1");
    saveLocalSettings({ autoLockMinutes: 15, safetyMode: false });

    expect(loadUserId()).toBe("user-1");
    expect(loadLocalSettings()).toEqual({
      autoLockMinutes: 15,
      safetyMode: false,
    });
  });
});

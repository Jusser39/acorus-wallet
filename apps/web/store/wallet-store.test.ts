import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_APP_PREFERENCES } from "../lib/app-preferences";
import { useWalletStore } from "./wallet-store";

describe("wallet store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useWalletStore.setState({
      isBootstrapped: false,
      userId: null,
      encryptedVault: null,
      unlockedVault: null,
      profiles: [],
      activeProfileId: null,
      selectedChainId: 1,
      safetyMode: true,
      autoLockMinutes: 10,
      ...DEFAULT_APP_PREFERENCES,
      lastHiddenAt: null,
      lastUnlockedAt: null,
      lastActivityAt: null,
      error: null,
    });
  });

  it("clears decrypted state on lock", () => {
    useWalletStore.getState().unlockVault({
      mnemonic: "test test test test test test test test test test test junk",
      evmAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    useWalletStore.getState().lockWallet();

    expect(useWalletStore.getState().unlockedVault).toBeNull();
    expect(useWalletStore.getState().lastActivityAt).toBeNull();
  });

  it("switches selected chain when activating a solana profile", () => {
    useWalletStore.getState().setProfiles([
      {
        id: "profile-sol",
        userId: "user-1",
        name: "Solana Wallet",
        type: "local",
        publicAddress: "11111111111111111111111111111111",
        chainFamily: "solana",
        hiddenBalance: false,
        preferredCurrency: "USD",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    expect(useWalletStore.getState().selectedChainId).toBe(101);
  });

  it("stores app-level display preferences", () => {
    useWalletStore.getState().setDisplayCurrency("JPY");
    useWalletStore.getState().setPreferredLanguage("ja");
    useWalletStore.getState().setTheme("dark");
    useWalletStore.getState().setHideSmallBalances(false);

    expect(useWalletStore.getState()).toMatchObject({
      displayCurrency: "JPY",
      preferredLanguage: "ja",
      theme: "dark",
      hideSmallBalances: false,
    });
  });
});

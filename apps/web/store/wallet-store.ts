"use client";

import { clearSensitiveMemoryBestEffort, type EncryptedVaultV1, type WalletVaultPlaintext } from "@acorus/wallet-core";
import {
  getDefaultChainIdForFamily,
  isEvmChainId,
  type ChainId,
  type WalletProfileRecord,
} from "@acorus/shared";
import { create } from "zustand";
import { DEFAULT_APP_PREFERENCES, type AppTheme } from "../lib/app-preferences";
import { clearAcorusLocalWalletState } from "../lib/reset-local-wallet";
import { clearSessionDecryptedState } from "../lib/storage";

const ACTIVITY_WRITE_THROTTLE_MS = 15_000;

function resolveChainIdForProfile(
  profile: WalletProfileRecord | null | undefined,
  currentChainId: ChainId,
): ChainId {
  if (!profile) {
    return currentChainId;
  }

  if (profile.chainFamily === "solana") {
    return getDefaultChainIdForFamily("solana");
  }

  if (profile.chainFamily === "evm") {
    return typeof currentChainId === "number" && isEvmChainId(currentChainId)
    ? currentChainId
    : getDefaultChainIdForFamily("evm");
  }

  return getDefaultChainIdForFamily(profile.chainFamily);
}

interface WalletState {
  isBootstrapped: boolean;
  userId: string | null;
  encryptedVault: EncryptedVaultV1 | null;
  unlockedVault: WalletVaultPlaintext | null;
  profiles: WalletProfileRecord[];
  activeProfileId: string | null;
  selectedChainId: ChainId;
  safetyMode: boolean;
  autoLockMinutes: number;
  theme: AppTheme;
  displayCurrency: string;
  preferredLanguage: string;
  analyticsEnabled: boolean;
  hideSmallBalances: boolean;
  hideUnknownTokens: boolean;
  hideFlaggedActivity: boolean;
  lastHiddenAt: number | null;
  lastUnlockedAt: number | null;
  lastActivityAt: number | null;
  error: string | null;
  setBootstrapped(value: boolean): void;
  setUserId(userId: string | null): void;
  setEncryptedVault(vault: EncryptedVaultV1 | null): void;
  unlockVault(vault: WalletVaultPlaintext): void;
  lockWallet(): void;
  setProfiles(profiles: WalletProfileRecord[]): void;
  upsertProfile(profile: WalletProfileRecord): void;
  setActiveProfileId(id: string | null): void;
  setSelectedChainId(chainId: ChainId): void;
  setSafetyMode(value: boolean): void;
  setAutoLockMinutes(value: number): void;
  setTheme(value: AppTheme): void;
  setDisplayCurrency(value: string): void;
  setPreferredLanguage(value: string): void;
  setAnalyticsEnabled(value: boolean): void;
  setHideSmallBalances(value: boolean): void;
  setHideUnknownTokens(value: boolean): void;
  setHideFlaggedActivity(value: boolean): void;
  setLastHiddenAt(value: number | null): void;
  markActivity(): void;
  setError(message: string | null): void;
  clearWalletState(): void;

  mockStakedBalances: Record<string, number>;
  stakeMockAsset(asset: string, amount: number): void;
  unstakeMockAsset(asset: string, amount: number): void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  isBootstrapped: false,
  userId: null,
  encryptedVault: null,
  unlockedVault: null,
  profiles: [],
  activeProfileId: null,
  selectedChainId: 1,
  safetyMode: true,
  autoLockMinutes: 10,
  theme: DEFAULT_APP_PREFERENCES.theme,
  displayCurrency: DEFAULT_APP_PREFERENCES.displayCurrency,
  preferredLanguage: DEFAULT_APP_PREFERENCES.preferredLanguage,
  analyticsEnabled: DEFAULT_APP_PREFERENCES.analyticsEnabled,
  hideSmallBalances: DEFAULT_APP_PREFERENCES.hideSmallBalances,
  hideUnknownTokens: DEFAULT_APP_PREFERENCES.hideUnknownTokens,
  hideFlaggedActivity: DEFAULT_APP_PREFERENCES.hideFlaggedActivity,
  lastHiddenAt: null,
  lastUnlockedAt: null,
  lastActivityAt: null,
  error: null,
  mockStakedBalances: {},
  stakeMockAsset(asset, amount) {
    const current = get().mockStakedBalances[asset] ?? 0;
    set({
      mockStakedBalances: {
        ...get().mockStakedBalances,
        [asset]: current + amount,
      },
    });
  },
  unstakeMockAsset(asset, amount) {
    const current = get().mockStakedBalances[asset] ?? 0;
    set({
      mockStakedBalances: {
        ...get().mockStakedBalances,
        [asset]: Math.max(0, current - amount),
      },
    });
  },
  setBootstrapped(value) {
    set({ isBootstrapped: value });
  },
  setUserId(userId) {
    set({ userId });
  },
  setEncryptedVault(vault) {
    set({ encryptedVault: vault });
  },
  unlockVault(vault) {
    const now = Date.now();
    set({
      unlockedVault: vault,
      lastUnlockedAt: now,
      lastActivityAt: now,
      error: null,
    });
  },
  lockWallet() {
    const current = get().unlockedVault;
    clearSensitiveMemoryBestEffort(current);
    clearSessionDecryptedState();
    set({
      unlockedVault: null,
      lastHiddenAt: null,
      lastUnlockedAt: null,
      lastActivityAt: null,
    });
  },
  setProfiles(profiles) {
    const activeId = get().activeProfileId;
    let nextActiveId = activeId && profiles.some((item) => item.id === activeId) ? activeId : null;
    
    if (nextActiveId && !get().isBootstrapped) {
      const activeProfile = profiles.find((item) => item.id === nextActiveId);
      if (activeProfile?.type === "practice") {
        nextActiveId = null;
      }
    }
    
    if (!nextActiveId) {
      const nonPractice = profiles.find((item) => item.type !== "practice");
      nextActiveId = nonPractice ? nonPractice.id : null;
    }
    
    const activeProfile =
      profiles.find((item) => item.id === nextActiveId) ?? null;

    set({
      profiles,
      activeProfileId: nextActiveId,
      selectedChainId: resolveChainIdForProfile(activeProfile, get().selectedChainId),
    });
  },
  upsertProfile(profile) {
    const current = get().profiles.filter((item) => item.id !== profile.id);
    const profiles = [profile, ...current];
    const activeProfileId = get().activeProfileId ?? profile.id;
    const activeProfile =
      profiles.find((item) => item.id === activeProfileId) ?? profile;

    set({
      profiles,
      activeProfileId,
      selectedChainId: resolveChainIdForProfile(activeProfile, get().selectedChainId),
    });
  },
  setActiveProfileId(id) {
    const profile = get().profiles.find((item) => item.id === id) ?? null;
    set({
      activeProfileId: id,
      selectedChainId: resolveChainIdForProfile(profile, get().selectedChainId),
    });
  },
  setSelectedChainId(chainId) {
    set({ selectedChainId: chainId });
  },
  setSafetyMode(value) {
    set({ safetyMode: value });
  },
  setAutoLockMinutes(value) {
    set({ autoLockMinutes: value });
  },
  setTheme(value) {
    set({ theme: value });
  },
  setDisplayCurrency(value) {
    set({ displayCurrency: value });
  },
  setPreferredLanguage(value) {
    set({ preferredLanguage: value });
  },
  setAnalyticsEnabled(value) {
    set({ analyticsEnabled: value });
  },
  setHideSmallBalances(value) {
    set({ hideSmallBalances: value });
  },
  setHideUnknownTokens(value) {
    set({ hideUnknownTokens: value });
  },
  setHideFlaggedActivity(value) {
    set({ hideFlaggedActivity: value });
  },
  setLastHiddenAt(value) {
    set({ lastHiddenAt: value });
  },
  markActivity() {
    if (!get().unlockedVault) {
      return;
    }

    const now = Date.now();
    const lastActivityAt = get().lastActivityAt;

    if (lastActivityAt && now - lastActivityAt < ACTIVITY_WRITE_THROTTLE_MS) {
      return;
    }

    set({ lastActivityAt: now });
  },
  setError(message) {
    set({ error: message });
  },
  clearWalletState() {
    clearSensitiveMemoryBestEffort(get().unlockedVault);
    clearAcorusLocalWalletState();
    clearSessionDecryptedState();
    set({
      userId: null,
      encryptedVault: null,
      unlockedVault: null,
      profiles: [],
      activeProfileId: null,
      selectedChainId: getDefaultChainIdForFamily("evm"),
      lastHiddenAt: null,
      lastUnlockedAt: null,
      lastActivityAt: null,
      error: null,
    });
  },
}));

export function useActiveProfile(): WalletProfileRecord | null {
  return useWalletStore((state) =>
    state.profiles.find((item) => item.id === state.activeProfileId) ?? null,
  );
}

"use client";

import { clearSensitiveMemoryBestEffort, type EncryptedVaultV1, type WalletVaultPlaintext } from "@acorus/wallet-core";
import {
  getDefaultChainIdForFamily,
  isEvmChainId,
  type ChainId,
  type WalletProfileRecord,
} from "@acorus/shared";
import { create } from "zustand";
import { clearAcorusLocalWalletState } from "../lib/reset-local-wallet";
import { clearSessionDecryptedState } from "../lib/storage";

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
  setLastHiddenAt(value: number | null): void;
   markActivity(): void;
   setError(message: string | null): void;
  clearWalletState(): void;
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
  lastHiddenAt: null,
  lastUnlockedAt: null,
  lastActivityAt: null,
  error: null,
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
    const nextActiveId =
      activeId && profiles.some((item) => item.id === activeId)
        ? activeId
        : profiles[0]?.id ?? null;
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
  setLastHiddenAt(value) {
    set({ lastHiddenAt: value });
  },
  markActivity() {
    if (!get().unlockedVault) {
      return;
    }

    set({ lastActivityAt: Date.now() });
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

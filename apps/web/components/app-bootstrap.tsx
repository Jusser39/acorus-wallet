"use client";

import { useEffect } from "react";
import { createAnonymousUser, fetchWalletProfiles } from "@/lib/api";
import {
  loadActiveProfileId,
  loadEncryptedVault,
  loadLocalSettings,
  loadUserId,
  saveActiveProfileId,
  saveLocalSettings,
  saveUserId,
} from "@/lib/storage";
import { useWalletStore } from "@/store/wallet-store";
import { ServiceWorkerRegister } from "./service-worker-register";

export function AppBootstrap() {
  const setBootstrapped = useWalletStore((state) => state.setBootstrapped);
  const setUserId = useWalletStore((state) => state.setUserId);
  const setEncryptedVault = useWalletStore((state) => state.setEncryptedVault);
  const setProfiles = useWalletStore((state) => state.setProfiles);
  const setActiveProfileId = useWalletStore((state) => state.setActiveProfileId);
  const setSafetyMode = useWalletStore((state) => state.setSafetyMode);
  const setAutoLockMinutes = useWalletStore((state) => state.setAutoLockMinutes);
  const autoLockMinutes = useWalletStore((state) => state.autoLockMinutes);
  const unlockedVault = useWalletStore((state) => state.unlockedVault);
  const lockWallet = useWalletStore((state) => state.lockWallet);
  const lastHiddenAt = useWalletStore((state) => state.lastHiddenAt);
  const setLastHiddenAt = useWalletStore((state) => state.setLastHiddenAt);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const storedVault = loadEncryptedVault();
      const storedSettings = loadLocalSettings();
      const storedActiveProfileId = loadActiveProfileId();
      const existingUserId = loadUserId();
      const userId: string =
        existingUserId ?? (await createAnonymousUser().then((response) => response.id));

      if (!active) {
        return;
      }

      if (!existingUserId) {
        saveUserId(userId);
      }

      setUserId(userId);
      setEncryptedVault(storedVault);
      setSafetyMode(storedSettings.safetyMode);
      setAutoLockMinutes(storedSettings.autoLockMinutes);
      setActiveProfileId(storedActiveProfileId);

      const profiles = await fetchWalletProfiles(userId).catch(() => []);

      if (!active) {
        return;
      }

      setProfiles(profiles);
      setBootstrapped(true);
    }

    bootstrap().catch(() => {
      setBootstrapped(true);
    });

    return () => {
      active = false;
    };
  }, [
    setActiveProfileId,
    setAutoLockMinutes,
    setBootstrapped,
    setEncryptedVault,
    setProfiles,
    setSafetyMode,
    setUserId,
  ]);

  useEffect(() => {
    saveLocalSettings({
      autoLockMinutes,
      safetyMode: useWalletStore.getState().safetyMode,
    });
  }, [autoLockMinutes]);

  useEffect(() => {
    const unsubscribe = useWalletStore.subscribe((state) => {
      saveLocalSettings({
        autoLockMinutes: state.autoLockMinutes,
        safetyMode: state.safetyMode,
      });
      saveActiveProfileId(state.activeProfileId);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        setLastHiddenAt(Date.now());
        return;
      }

      if (
        document.visibilityState === "visible" &&
        unlockedVault &&
        lastHiddenAt &&
        Date.now() - lastHiddenAt > autoLockMinutes * 60_000
      ) {
        lockWallet();
      }

      setLastHiddenAt(null);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [autoLockMinutes, lastHiddenAt, lockWallet, setLastHiddenAt, unlockedVault]);

  return <ServiceWorkerRegister />;
}

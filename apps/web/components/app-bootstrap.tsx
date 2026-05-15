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
  const setError = useWalletStore((state) => state.setError);
  const markActivity = useWalletStore((state) => state.markActivity);
  const autoLockMinutes = useWalletStore((state) => state.autoLockMinutes);
  const unlockedVault = useWalletStore((state) => state.unlockedVault);
  const lockWallet = useWalletStore((state) => state.lockWallet);
  const lastHiddenAt = useWalletStore((state) => state.lastHiddenAt);
  const lastActivityAt = useWalletStore((state) => state.lastActivityAt);
  const setLastHiddenAt = useWalletStore((state) => state.setLastHiddenAt);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      let storedVault = null;

      try {
        storedVault = loadEncryptedVault();
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unable to read local vault.");
      }

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
      setError("Wallet bootstrap failed.");
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
    setError,
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
    if (!unlockedVault) {
      return;
    }

    const activityEvents: Array<keyof WindowEventMap> = [
      "click",
      "keydown",
      "mousemove",
      "pointerdown",
      "touchstart",
    ];
    const handleActivity = () => markActivity();

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }

    return () => {
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, handleActivity);
      }
    };
  }, [markActivity, unlockedVault]);

  useEffect(() => {
    if (!unlockedVault || !lastActivityAt) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const idleMs = Date.now() - (useWalletStore.getState().lastActivityAt ?? Date.now());

      if (idleMs >= useWalletStore.getState().autoLockMinutes * 60_000) {
        lockWallet();
      }
    }, 15_000);

    return () => window.clearInterval(intervalId);
  }, [lastActivityAt, lockWallet, unlockedVault]);

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
      } else if (document.visibilityState === "visible" && unlockedVault) {
        markActivity();
      }

      setLastHiddenAt(null);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [autoLockMinutes, lastHiddenAt, lockWallet, markActivity, setLastHiddenAt, unlockedVault]);

  return <ServiceWorkerRegister />;
}

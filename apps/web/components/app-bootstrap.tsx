"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createAnonymousUser, createWalletProfile, fetchWalletProfiles } from "@/lib/api";
import { applyAppPreferencesToDocument } from "@/lib/app-preferences";
import {
  loadActiveProfileId,
  loadEncryptedVault,
  loadLocalSettings,
  loadUserId,
  saveActiveProfileId,
  saveLocalSettings,
  saveUserId,
  loadPersistedProfiles,
  savePersistedProfiles,
} from "@/lib/storage";
import { useWalletStore } from "@/store/wallet-store";
import { ServiceWorkerRegister } from "./service-worker-register";

const NON_WALLET_PATHS = ["/", "/unlock", "/create", "/import"];

function buildPersistedWalletSettingsSnapshot() {
  const state = useWalletStore.getState();

  return JSON.stringify({
    activeProfileId: state.activeProfileId,
    autoLockMinutes: state.autoLockMinutes,
    safetyMode: state.safetyMode,
    theme: state.theme,
    displayCurrency: state.displayCurrency,
    preferredLanguage: state.preferredLanguage,
    analyticsEnabled: state.analyticsEnabled,
    hideSmallBalances: state.hideSmallBalances,
    hideUnknownTokens: state.hideUnknownTokens,
    hideFlaggedActivity: state.hideFlaggedActivity,
  });
}

export function AppBootstrap() {
  const router = useRouter();
  const pathname = usePathname();
  const setBootstrapped = useWalletStore((state) => state.setBootstrapped);
  const setUserId = useWalletStore((state) => state.setUserId);
  const setEncryptedVault = useWalletStore((state) => state.setEncryptedVault);
  const setProfiles = useWalletStore((state) => state.setProfiles);
  const setActiveProfileId = useWalletStore((state) => state.setActiveProfileId);
  const setSafetyMode = useWalletStore((state) => state.setSafetyMode);
  const setAutoLockMinutes = useWalletStore((state) => state.setAutoLockMinutes);
  const setTheme = useWalletStore((state) => state.setTheme);
  const setDisplayCurrency = useWalletStore((state) => state.setDisplayCurrency);
  const setPreferredLanguage = useWalletStore((state) => state.setPreferredLanguage);
  const setAnalyticsEnabled = useWalletStore((state) => state.setAnalyticsEnabled);
  const setHideSmallBalances = useWalletStore((state) => state.setHideSmallBalances);
  const setHideUnknownTokens = useWalletStore((state) => state.setHideUnknownTokens);
  const setHideFlaggedActivity = useWalletStore((state) => state.setHideFlaggedActivity);
  const setError = useWalletStore((state) => state.setError);
  const markActivity = useWalletStore((state) => state.markActivity);
  const autoLockMinutes = useWalletStore((state) => state.autoLockMinutes);
  const theme = useWalletStore((state) => state.theme);
  const displayCurrency = useWalletStore((state) => state.displayCurrency);
  const preferredLanguage = useWalletStore((state) => state.preferredLanguage);
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
      let userId: string = existingUserId ?? "";

      if (!existingUserId) {
        try {
          const user = await createAnonymousUser();
          userId = user.id;
          saveUserId(userId);
          if (user.token) {
            const { saveApiToken } = await import("@/lib/storage");
            saveApiToken(user.token);
          }
        } catch (error) {
          userId = `local_${crypto.randomUUID()}`;
          saveUserId(userId);
        }
      }

      if (!active) {
        return;
      }

      setUserId(userId);
      setEncryptedVault(storedVault);
      setSafetyMode(storedSettings.safetyMode);
      setAutoLockMinutes(storedSettings.autoLockMinutes);
      setTheme(storedSettings.theme);
      setDisplayCurrency(storedSettings.displayCurrency);
      setPreferredLanguage(storedSettings.preferredLanguage);
      setAnalyticsEnabled(storedSettings.analyticsEnabled);
      setHideSmallBalances(storedSettings.hideSmallBalances);
      setHideUnknownTokens(storedSettings.hideUnknownTokens);
      setHideFlaggedActivity(storedSettings.hideFlaggedActivity);
      setActiveProfileId(storedActiveProfileId);

      let profiles = await fetchWalletProfiles(userId).catch(() => []);

      const localProfiles = loadPersistedProfiles();
      if (localProfiles.length > 0) {
        const backendProfileIds = new Set(profiles.map((p) => p.id));
        const missingProfiles = localProfiles.filter((p) => !backendProfileIds.has(p.id));
        if (missingProfiles.length > 0) {
          const restoredProfiles = [];
          for (const profile of missingProfiles) {
            try {
              const restored = await createWalletProfile({
                userId,
                name: profile.name,
                type: profile.type,
                publicAddress: profile.publicAddress,
                chainFamily: profile.chainFamily,
                hiddenBalance: profile.hiddenBalance,
                preferredCurrency: profile.preferredCurrency,
              });
              restoredProfiles.push(restored);
            } catch (err) {
              console.error("Failed to restore profile on backend:", err);
              restoredProfiles.push(profile);
            }
          }
          profiles = [...profiles, ...restoredProfiles];
        }
      }

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
    setAnalyticsEnabled,
    setAutoLockMinutes,
    setBootstrapped,
    setDisplayCurrency,
    setEncryptedVault,
    setHideFlaggedActivity,
    setHideSmallBalances,
    setHideUnknownTokens,
    setProfiles,
    setPreferredLanguage,
    setSafetyMode,
    setError,
    setTheme,
    setUserId,
  ]);

  useEffect(() => {
    let lastPersistedSnapshot = buildPersistedWalletSettingsSnapshot();

    const unsubscribe = useWalletStore.subscribe((state) => {
      const nextSnapshot = buildPersistedWalletSettingsSnapshot();

      if (nextSnapshot === lastPersistedSnapshot) {
        return;
      }

      lastPersistedSnapshot = nextSnapshot;

      saveLocalSettings({
        autoLockMinutes: state.autoLockMinutes,
        safetyMode: state.safetyMode,
        theme: state.theme,
        displayCurrency: state.displayCurrency,
        preferredLanguage: state.preferredLanguage,
        analyticsEnabled: state.analyticsEnabled,
        hideSmallBalances: state.hideSmallBalances,
        hideUnknownTokens: state.hideUnknownTokens,
        hideFlaggedActivity: state.hideFlaggedActivity,
      });
      saveActiveProfileId(state.activeProfileId);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = useWalletStore.subscribe((state) => {
      savePersistedProfiles(state.profiles);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    applyAppPreferencesToDocument({
      theme,
      displayCurrency,
      preferredLanguage,
    });
  }, [displayCurrency, preferredLanguage, theme]);

  useEffect(() => {
    if (!unlockedVault) {
      return;
    }

    const activityEvents: Array<keyof WindowEventMap> = [
      "click",
      "keydown",
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
        if (!NON_WALLET_PATHS.includes(pathname)) {
          router.push("/unlock");
        }
      }
    }, 15_000);

    return () => window.clearInterval(intervalId);
  }, [lastActivityAt, lockWallet, pathname, router, unlockedVault]);

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
        if (!NON_WALLET_PATHS.includes(pathname)) {
          router.push("/unlock");
        }
      } else if (document.visibilityState === "visible" && unlockedVault) {
        markActivity();
      }

      setLastHiddenAt(null);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [autoLockMinutes, lastHiddenAt, lockWallet, markActivity, pathname, router, setLastHiddenAt, unlockedVault]);

  return <ServiceWorkerRegister />;
}

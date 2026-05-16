"use client";

import { useEffect, useMemo } from "react";
import {
  ACORUS_EXTENSION_WALLET_SYNC,
  type DappWalletSyncEnvelope,
} from "@acorus/shared";
import { useWalletStore } from "@/store/wallet-store";

export function ExtensionProfileSync() {
  const isBootstrapped = useWalletStore((state) => state.isBootstrapped);
  const profiles = useWalletStore((state) => state.profiles);
  const activeProfileId = useWalletStore((state) => state.activeProfileId);

  const syncedProfiles = useMemo(
    () =>
      profiles
        .filter((profile) => profile.chainFamily === "evm" && profile.type === "local")
        .map((profile) => ({
          id: profile.id,
          name: profile.name,
          type: profile.type,
          publicAddress: profile.publicAddress,
          chainFamily: profile.chainFamily,
        })),
    [profiles],
  );

  useEffect(() => {
    if (!isBootstrapped) {
      return;
    }

    const payload: DappWalletSyncEnvelope = {
      type: ACORUS_EXTENSION_WALLET_SYNC,
      source: "acorus_wallet_web",
      activeProfileId,
      profiles: syncedProfiles,
      syncedAt: new Date().toISOString(),
    };

    window.postMessage(payload, window.location.origin);
  }, [activeProfileId, isBootstrapped, syncedProfiles]);

  return null;
}

"use client";

import { useEffect, useState } from "react";
import type { ChainFamily, ChainId } from "@acorus/shared";
import {
  getExtensionVaultStatus,
  hasAcorusExtension,
  requestAcorusProviderDiscovery,
  type ExtensionVaultStatus,
} from "@/lib/extension-bridge";
import { formatAddress } from "@/lib/utils";

export function ExtensionWalletCard(props: {
  title?: string;
  family?: ChainFamily;
  chainId?: ChainId;
}) {
  const [status, setStatus] = useState<ExtensionVaultStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);

    try {
      setStatus(await getExtensionVaultStatus());
    } catch (nextError) {
      setStatus(null);
      setError(nextError instanceof Error ? nextError.message : "Extension is unavailable.");
    }
  }

  useEffect(() => {
    let mounted = true;
    let detectionTimer: number | null = null;

    function detectAndRefresh() {
      requestAcorusProviderDiscovery();
      detectionTimer = window.setTimeout(() => {
        if (!mounted) {
          return;
        }

        if (!hasAcorusExtension()) {
          setError("Install and enable Acorus Wallet Extension to use website-controlled wallet actions.");
          return;
        }

        void refresh();
      }, 100);
    }

    detectAndRefresh();

    return () => {
      mounted = false;
      if (detectionTimer !== null) {
        window.clearTimeout(detectionTimer);
      }
    };
  }, []);

  const profiles = status?.profiles.filter((profile) =>
    (!props.family || profile.chainFamily === props.family)
    && (
      props.chainId === undefined
      || profile.chainIds.some((chainId) => String(chainId) === String(props.chainId))
    ),
  ) ?? [];

  return (
    <div className="panel space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {props.title ?? "Acorus Extension"}
          </h2>

        </div>
        <button type="button" className="button-secondary" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          {error}
        </div>
      ) : null}

      {status ? (
        <div className="grid gap-3 text-sm">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-slate-400">Vault</p>
            <p className="mt-1 font-medium text-white">
              {status.hasVault ? (status.isUnlocked ? "Unlocked" : "Locked") : "Not created"}
            </p>
          </div>

          {profiles.length > 0 ? (
            <p className="text-sm text-slate-400">
              {profiles.length} profile{profiles.length !== 1 ? "s" : ""} available in vault.
            </p>
          ) : (
            <p className="text-sm text-slate-400">
              No matching extension profile for this network yet.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

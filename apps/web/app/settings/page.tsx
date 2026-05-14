"use client";

import { useMemo, useState } from "react";
import { clearEncryptedVault } from "@/lib/storage";
import { updateWalletProfile } from "@/lib/api";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";

export default function SettingsPage() {
  const activeProfile = useActiveProfile();
  const userId = useWalletStore((state) => state.userId);
  const setSafetyMode = useWalletStore((state) => state.setSafetyMode);
  const safetyMode = useWalletStore((state) => state.safetyMode);
  const autoLockMinutes = useWalletStore((state) => state.autoLockMinutes);
  const setAutoLockMinutes = useWalletStore((state) => state.setAutoLockMinutes);
  const lockWallet = useWalletStore((state) => state.lockWallet);
  const setEncryptedVault = useWalletStore((state) => state.setEncryptedVault);
  const upsertProfile = useWalletStore((state) => state.upsertProfile);
  const [walletName, setWalletName] = useState(activeProfile?.name ?? "");
  const [hiddenBalance, setHiddenBalance] = useState(activeProfile?.hiddenBalance ?? false);
  const [preferredCurrency, setPreferredCurrency] = useState(
    activeProfile?.preferredCurrency ?? "USD",
  );
  const [message, setMessage] = useState<string | null>(null);

  const canSave = useMemo(() => Boolean(activeProfile && userId), [activeProfile, userId]);

  async function handleSave() {
    if (!activeProfile || !userId) {
      return;
    }

    const next = await updateWalletProfile(activeProfile.id, {
      userId,
      name: walletName,
      hiddenBalance,
      preferredCurrency,
    });

    upsertProfile(next);
    setMessage("Settings saved.");
  }

  return (
    <section className="page grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <div className="panel space-y-5">
        <div>
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="mt-2 text-sm text-slate-300">
            Face ID / биометрия будут добавлены на mobile-этапе через Keychain/Keystore.
          </p>
        </div>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Wallet name</span>
          <input value={walletName} onChange={(event) => setWalletName(event.target.value)} />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Preferred currency</span>
          <select
            value={preferredCurrency}
            onChange={(event) => setPreferredCurrency(event.target.value as "USD" | "EUR" | "RUB")}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="RUB">RUB</option>
          </select>
        </label>

        <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <span>Hide balances</span>
          <input
            type="checkbox"
            checked={hiddenBalance}
            onChange={(event) => setHiddenBalance(event.target.checked)}
            className="h-4 w-4"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Autolock timeout (minutes)</span>
          <input
            type="number"
            min="1"
            value={autoLockMinutes}
            onChange={(event) => setAutoLockMinutes(Number(event.target.value) || 1)}
          />
        </label>

        <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <span>Safety mode (blocks real mainnet send)</span>
          <input
            type="checkbox"
            checked={safetyMode}
            onChange={(event) => setSafetyMode(event.target.checked)}
            className="h-4 w-4"
          />
        </label>

        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

        <button type="button" className="button-primary" disabled={!canSave} onClick={() => void handleSave()}>
          Save settings
        </button>
      </div>

      <aside className="space-y-6">
        <div className="panel space-y-4">
          <h2 className="text-xl font-semibold">Lock controls</h2>
          <button type="button" className="button-secondary w-full" onClick={() => lockWallet()}>
            Lock wallet now
          </button>
        </div>

        <div className="panel space-y-4">
          <h2 className="text-xl font-semibold text-rose-200">Danger zone</h2>
          <p className="text-sm text-slate-300">
            Это удалит только локальный encrypted vault. Seed phrase и passcode восстановить нельзя.
          </p>
          <button
            type="button"
            className="button-secondary w-full border-rose-500/40 text-rose-200"
            onClick={() => {
              clearEncryptedVault();
              setEncryptedVault(null);
              lockWallet();
              setMessage("Local vault removed from this device.");
            }}
          >
            Clear local vault
          </button>
        </div>
      </aside>
    </section>
  );
}

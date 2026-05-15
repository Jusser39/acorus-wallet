"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clearEncryptedVault } from "@/lib/storage";
import { updateWalletProfile } from "@/lib/api";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";

const AUTOLOCK_OPTIONS = [1, 5, 10, 30] as const;

export default function SettingsPage() {
  const activeProfile = useActiveProfile();
  const userId = useWalletStore((state) => state.userId);
  const setSafetyMode = useWalletStore((state) => state.setSafetyMode);
  const safetyMode = useWalletStore((state) => state.safetyMode);
  const autoLockMinutes = useWalletStore((state) => state.autoLockMinutes);
  const setAutoLockMinutes = useWalletStore((state) => state.setAutoLockMinutes);
  const lockWallet = useWalletStore((state) => state.lockWallet);
  const setEncryptedVault = useWalletStore((state) => state.setEncryptedVault);
  const encryptedVault = useWalletStore((state) => state.encryptedVault);
  const upsertProfile = useWalletStore((state) => state.upsertProfile);
  const [walletName, setWalletName] = useState(activeProfile?.name ?? "");
  const [hiddenBalance, setHiddenBalance] = useState(activeProfile?.hiddenBalance ?? false);
  const [preferredCurrency, setPreferredCurrency] = useState(
    activeProfile?.preferredCurrency ?? "USD",
  );
  const [dangerText, setDangerText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWalletName(activeProfile?.name ?? "");
    setHiddenBalance(activeProfile?.hiddenBalance ?? false);
    setPreferredCurrency(activeProfile?.preferredCurrency ?? "USD");
  }, [activeProfile]);

  const canSave = useMemo(() => Boolean(activeProfile && userId), [activeProfile, userId]);

  async function handleSave() {
    if (!activeProfile || !userId) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      const next = await updateWalletProfile(activeProfile.id, {
        userId,
        name: walletName,
        hiddenBalance,
        preferredCurrency,
      });

      upsertProfile(next);
      setMessage("Settings saved.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось сохранить настройки.");
    }
  }

  function handleSafetyModeToggle(nextValue: boolean) {
    if (!nextValue) {
      const confirmed = window.confirm(
        "Отключить safety mode? После этого приложение позволит реальный mainnet send после final confirmation.",
      );

      if (!confirmed) {
        return;
      }
    }

    setSafetyMode(nextValue);
    setMessage(nextValue ? "Safety mode enabled." : "Safety mode disabled.");
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
          <select
            value={autoLockMinutes}
            onChange={(event) => setAutoLockMinutes(Number(event.target.value))}
          >
            {AUTOLOCK_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minute{minutes === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <span>Safety mode (blocks real mainnet send)</span>
          <input
            type="checkbox"
            checked={safetyMode}
            onChange={(event) => handleSafetyModeToggle(event.target.checked)}
            className="h-4 w-4"
          />
        </label>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

        <button type="button" className="button-primary" disabled={!canSave} onClick={() => void handleSave()}>
          Save settings
        </button>
        <Link href="/tokens/manage" className="button-secondary inline-flex items-center justify-center">
          Manage tokens
        </Link>
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
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Введите DELETE для подтверждения</span>
            <input value={dangerText} onChange={(event) => setDangerText(event.target.value)} />
          </label>
          <button
            type="button"
            className="button-secondary w-full border-rose-500/40 text-rose-200"
            disabled={!encryptedVault || dangerText !== "DELETE"}
            onClick={() => {
              clearEncryptedVault();
              setEncryptedVault(null);
              lockWallet();
              setDangerText("");
              setMessage("Local vault removed from this device.");
            }}
          >
            {encryptedVault ? "Clear local vault" : "No local vault on this device"}
          </button>
        </div>
      </aside>
    </section>
  );
}

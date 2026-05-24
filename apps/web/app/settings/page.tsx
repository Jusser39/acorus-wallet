"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  APP_CURRENCIES,
  APP_LANGUAGES,
  applyAppPreferencesToDocument,
  buildGoogleTranslateUrl,
  getCurrencyOption,
  getLanguageOption,
  toMarketDataCurrency,
  type AppTheme,
} from "@/lib/app-preferences";
import { updateWalletProfile } from "@/lib/api";
import { clearEncryptedVault } from "@/lib/storage";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";

const AUTOLOCK_OPTIONS = [1, 5, 10, 30] as const;
const THEME_OPTIONS: Array<{ label: string; value: AppTheme; mark: string }> = [
  { label: "Авто", value: "auto", mark: "A" },
  { label: "День", value: "light", mark: "☼" },
  { label: "Ночь", value: "dark", mark: "◐" },
];

function SettingsToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange(next: boolean): void;
}) {
  return (
    <button
      type="button"
      className="wallet-menu-toggle"
      data-checked={checked}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

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
  const theme = useWalletStore((state) => state.theme);
  const setTheme = useWalletStore((state) => state.setTheme);
  const displayCurrency = useWalletStore((state) => state.displayCurrency);
  const setDisplayCurrency = useWalletStore((state) => state.setDisplayCurrency);
  const preferredLanguage = useWalletStore((state) => state.preferredLanguage);
  const setPreferredLanguage = useWalletStore((state) => state.setPreferredLanguage);
  const analyticsEnabled = useWalletStore((state) => state.analyticsEnabled);
  const setAnalyticsEnabled = useWalletStore((state) => state.setAnalyticsEnabled);
  const hideSmallBalances = useWalletStore((state) => state.hideSmallBalances);
  const setHideSmallBalances = useWalletStore((state) => state.setHideSmallBalances);
  const hideUnknownTokens = useWalletStore((state) => state.hideUnknownTokens);
  const setHideUnknownTokens = useWalletStore((state) => state.setHideUnknownTokens);
  const hideFlaggedActivity = useWalletStore((state) => state.hideFlaggedActivity);
  const setHideFlaggedActivity = useWalletStore((state) => state.setHideFlaggedActivity);
  const [walletName, setWalletName] = useState(activeProfile?.name ?? "");
  const [hiddenBalance, setHiddenBalance] = useState(activeProfile?.hiddenBalance ?? false);
  const [dangerText, setDangerText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWalletName(activeProfile?.name ?? "");
    setHiddenBalance(activeProfile?.hiddenBalance ?? false);
  }, [activeProfile]);

  const canSave = useMemo(() => Boolean(displayCurrency && preferredLanguage && theme), [displayCurrency, preferredLanguage, theme]);
  const currency = getCurrencyOption(displayCurrency);
  const language = getLanguageOption(preferredLanguage);

  useEffect(() => {
    applyAppPreferencesToDocument({
      theme,
      displayCurrency,
      preferredLanguage,
    });
  }, [displayCurrency, preferredLanguage, theme]);

  async function handleSave() {
    setMessage(null);
    setError(null);

    try {
      if (activeProfile && userId) {
        const next = await updateWalletProfile(activeProfile.id, {
          userId,
          name: walletName,
          hiddenBalance,
          preferredCurrency: toMarketDataCurrency(displayCurrency),
        });

        upsertProfile(next);
      }

      setMessage(activeProfile ? "Настройки сохранены." : "Настройки сайта сохранены локально.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось сохранить настройки.");
    }
  }

  function handleLanguageSelect(code: string) {
    setPreferredLanguage(code);
    applyAppPreferencesToDocument({
      theme,
      displayCurrency,
      preferredLanguage: code,
    });

    if (code !== "ru") {
      window.location.assign(buildGoogleTranslateUrl({
        targetLanguage: code,
        pageUrl: window.location.href,
      }));
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
    <section className="page grid gap-6 xl:grid-cols-[1fr_0.72fr]">
      <div className="magic-panel space-y-6 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="acorus-pill w-fit">Acorus settings</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">Настройки</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Внешний вид, валюта, язык и приватность сохраняются локально. Seed phrase,
              private key и passcode не отправляются на сервер.
            </p>
          </div>
          <Link href="/wallet" className="magic-button-secondary px-4 py-2 text-sm">
            ← Wallet
          </Link>
        </div>

        <section className="grid gap-4">
          <div className="wallet-settings-row">
            <div>
              <p className="font-black text-slate-950">Тема</p>
              <p className="text-sm text-slate-500">Автоматически, светлая или темная.</p>
            </div>
            <div className="wallet-segmented">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  data-active={theme === option.value}
                  aria-label={option.label}
                  onClick={() => setTheme(option.value)}
                >
                  {option.mark}
                </button>
              ))}
            </div>
          </div>

          <label className="wallet-settings-row">
            <span>
              <span className="block font-black text-slate-950">Местная валюта</span>
              <span className="block text-sm text-slate-500">
                Сейчас выбрано {currency.code} ({currency.symbol}).
              </span>
            </span>
            <select
              value={displayCurrency}
              onChange={(event) => setDisplayCurrency(event.target.value)}
              className="wallet-menu-select min-w-40"
            >
              {APP_CURRENCIES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} · {item.name}
                </option>
              ))}
            </select>
          </label>

          <div className="wallet-settings-row items-start">
            <span>
              <span className="block font-black text-slate-950">Язык</span>
              <span className="block text-sm text-slate-500">
                Сейчас выбрано: {language.nativeName}.
              </span>
            </span>
            <span className="rounded-full bg-white/70 px-4 py-2 text-sm font-black text-violet-700">
              {language.code.toUpperCase()}
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {APP_LANGUAGES.map((item) => (
              <button
                key={item.code}
                type="button"
                className="flex items-center justify-between rounded-[20px] border border-violet-100 bg-white/70 px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
                data-active={preferredLanguage === item.code}
                onClick={() => handleLanguageSelect(item.code)}
              >
                <span>
                  <span className="block font-black text-slate-950">{item.nativeName}</span>
                  <span className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    {item.code}
                  </span>
                </span>
                {preferredLanguage === item.code ? (
                  <span className="rounded-full bg-fuchsia-500 px-3 py-1 text-sm font-black text-white">
                    ✓
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-4">
          <h2 className="text-2xl font-black text-slate-950">Балансы и активность</h2>
          <label className="wallet-settings-row">
            <span>
              <span className="block font-black text-slate-950">Скрыть баланс профиля</span>
              <span className="block text-sm text-slate-500">Сумма будет скрыта на сайте.</span>
            </span>
            <SettingsToggle checked={hiddenBalance} onChange={setHiddenBalance} />
          </label>
          <div className="wallet-settings-row">
            <span>
              <span className="block font-black text-slate-950">Скрыть небольшие балансы</span>
              <span className="block text-sm text-slate-500">Балансы меньше 1 USD не показываются.</span>
            </span>
            <SettingsToggle checked={hideSmallBalances} onChange={setHideSmallBalances} />
          </div>
          <div className="wallet-settings-row">
            <span>
              <span className="block font-black text-slate-950">Скрыть неизвестные токены</span>
              <span className="block text-sm text-slate-500">Убирает подозрительные активы из портфеля.</span>
            </span>
            <SettingsToggle checked={hideUnknownTokens} onChange={setHideUnknownTokens} />
          </div>
          <div className="wallet-settings-row">
            <span>
              <span className="block font-black text-slate-950">Скрыть отмеченные действия</span>
              <span className="block text-sm text-slate-500">Spam-транзакции не попадают в активность.</span>
            </span>
            <SettingsToggle checked={hideFlaggedActivity} onChange={setHideFlaggedActivity} />
          </div>
        </section>

        <section className="grid gap-4">
          <h2 className="text-2xl font-black text-slate-950">Кошелек</h2>
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-600">Wallet name</span>
            <input
              value={walletName}
              onChange={(event) => setWalletName(event.target.value)}
              className="light-field rounded-[22px] border border-violet-200/80 bg-white/80 px-4 py-4"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-600">Autolock timeout</span>
            <select
              value={autoLockMinutes}
              onChange={(event) => setAutoLockMinutes(Number(event.target.value))}
              className="light-field rounded-[22px] border border-violet-200/80 bg-white/80 px-4 py-4"
            >
              {AUTOLOCK_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minute{minutes === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>

          <div className="wallet-settings-row">
            <span>
              <span className="block font-black text-slate-950">Safety mode</span>
              <span className="block text-sm text-slate-500">Блокирует реальную mainnet отправку до финального подтверждения.</span>
            </span>
            <SettingsToggle checked={safetyMode} onChange={handleSafetyModeToggle} />
          </div>

          <div className="wallet-settings-row">
            <span>
              <span className="block font-black text-slate-950">Аналитика</span>
              <span className="block text-sm text-slate-500">Разрешить обезличенные UX-события.</span>
            </span>
            <SettingsToggle checked={analyticsEnabled} onChange={setAnalyticsEnabled} />
          </div>
        </section>

        {error ? <p className="rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p> : null}
        {message ? <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="magic-button px-5 py-3"
            disabled={!canSave}
            onClick={() => void handleSave()}
          >
            Save settings
          </button>
          <Link href="/tokens/manage" className="magic-button-secondary px-5 py-3">
            Manage tokens
          </Link>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="magic-panel space-y-4 p-6">
          <h2 className="text-2xl font-black text-slate-950">Lock controls</h2>
          <button type="button" className="wallet-outline-action" onClick={() => lockWallet()}>
            Lock wallet now <span>→</span>
          </button>
        </div>

        <div className="magic-panel space-y-4 p-6">
          <h2 className="text-2xl font-black text-rose-700">Danger zone</h2>
          <p className="text-sm leading-6 text-slate-600">
            Это удалит только локальный encrypted vault. Seed phrase и passcode восстановить нельзя.
          </p>
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-600">Введите DELETE для подтверждения</span>
            <input
              value={dangerText}
              onChange={(event) => setDangerText(event.target.value)}
              className="light-field rounded-[22px] border border-rose-200 bg-white/80 px-4 py-4"
            />
          </label>
          <button
            type="button"
            className="wallet-outline-action border-rose-200 text-rose-700"
            disabled={!encryptedVault || dangerText !== "DELETE"}
            onClick={() => {
              clearEncryptedVault();
              setEncryptedVault(null);
              lockWallet();
              setDangerText("");
              setMessage("Local vault removed from this device.");
            }}
          >
            {encryptedVault ? "Clear local vault" : "No local vault on this device"} <span>→</span>
          </button>
        </div>
      </aside>
    </section>
  );
}

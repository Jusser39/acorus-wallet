"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  APP_CURRENCIES,
  APP_LANGUAGES,
  buildGoogleTranslateUrl,
  getCurrencyOption,
  getLanguageOption,
  isAppTheme,
  type AppTheme,
} from "@/lib/app-preferences";
import { formatAddress } from "@/lib/utils";
import { useActiveProfile, useWalletStore, type WalletProfile } from "@/store/wallet-store";

type WalletAccountMenuView = "home" | "settings" | "activity";

const THEME_OPTIONS: Array<{ label: string; value: AppTheme; glyph: string }> = [
  { label: "Авто", value: "auto", glyph: "A" },
  { label: "Светлая", value: "light", glyph: "☼" },
  { label: "Темная", value: "dark", glyph: "◐" },
];

function Toggle({
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

function MenuAction({
  href,
  label,
  detail,
  icon,
  onClick,
}: {
  href?: string;
  label: string;
  detail?: string;
  icon: string;
  onClick?(): void;
}) {
  const content = (
    <>
      <span className="wallet-menu-action-icon">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-black text-slate-950">{label}</span>
        {detail ? <span className="block truncate text-xs text-slate-500">{detail}</span> : null}
      </span>
      <span className="text-xl leading-none text-slate-400">›</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="wallet-menu-action" onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className="wallet-menu-action" onClick={onClick}>
      {content}
    </button>
  );
}

export function WalletAccountMenu() {
  const activeProfile = useActiveProfile();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<WalletAccountMenuView>("home");
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("https://24wallet.ru");
  const [extensionDetected, setExtensionDetected] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const lockWallet = useWalletStore((state) => state.lockWallet);
  const addProfile = useWalletStore((state) => state.addProfile);
  const setActiveProfileId = useWalletStore((state) => state.setActiveProfileId);
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

  const address = activeProfile?.publicAddress ?? "";
  const currency = getCurrencyOption(displayCurrency);
  const language = getLanguageOption(preferredLanguage);
  const translateUrl = useMemo(
    () => buildGoogleTranslateUrl({ targetLanguage: preferredLanguage, pageUrl: currentUrl }),
    [currentUrl, preferredLanguage],
  );

  useEffect(() => {
    setCurrentUrl(window.location.href);
    if (typeof window !== "undefined" && window.ethereum?.isAcorus) {
      setExtensionDetected(true);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function copyAddress() {
    if (!address) {
      return;
    }

    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  async function connectExtension() {
    if (!window.ethereum?.isAcorus) return;
    try {
      const accounts = await window.ethereum.request<string[]>({ method: "eth_requestAccounts" });
      const address = accounts[0];
      if (address) {
        const id = `ext_${address}`;
        const existing = useWalletStore.getState().profiles.find((p) => p.id === id);
        if (!existing) {
          addProfile({
            id,
            name: "Extension Wallet",
            type: "injected",
            chainFamily: "evm",
            publicAddress: address,
          });
        }
        setActiveProfileId(id);
        setOpen(false);
      }
    } catch (e) {
      console.error("Failed to connect extension", e);
    }
  }

  function closeAfterNavigate() {
    setOpen(false);
    setView("home");
  }

  const triggerLabel = activeProfile
    ? `${activeProfile.name} · ${activeProfile.chainFamily.toUpperCase()} · ${formatAddress(activeProfile.publicAddress)}`
    : "No active wallet";

  return (
    <div className="wallet-account-menu" ref={menuRef}>
      <button
        type="button"
        className="wallet-account-trigger"
        aria-expanded={open}
        onClick={() => {
          setOpen((next) => !next);
          setView("home");
        }}
      >
        <span className="wallet-avatar">{activeProfile ? activeProfile.chainFamily.slice(0, 1).toUpperCase() : "A"}</span>
        <span className="min-w-0 truncate">{triggerLabel}</span>
      </button>

      {open ? (
        <div className="wallet-account-panel">
          {view === "home" ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="wallet-avatar size-14 text-lg">
                    {activeProfile ? activeProfile.chainFamily.slice(0, 1).toUpperCase() : "A"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-black text-slate-950">
                      {activeProfile ? formatAddress(activeProfile.publicAddress) : "Кошелек не выбран"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {activeProfile
                        ? `${activeProfile.name} · ${activeProfile.chainFamily.toUpperCase()}`
                        : "Создайте, импортируйте или подключите расширение"}
                    </p>
                    {!activeProfile && extensionDetected && (
                      <button
                        type="button"
                        onClick={connectExtension}
                        className="mt-2 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700"
                      >
                        Подключить расширение
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="wallet-round-button"
                    aria-label="Open settings"
                    onClick={() => setView("settings")}
                  >
                    ⚙
                  </button>
                  <button
                    type="button"
                    className="wallet-round-button"
                    aria-label="Lock wallet"
                    onClick={() => {
                      lockWallet();
                      setOpen(false);
                    }}
                  >
                    ⏻
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-5xl font-black tracking-tight text-slate-950">0,00 $</p>
                <p className="mt-2 text-sm font-bold text-emerald-600">▲ 0,00%</p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Link href="/send" className="wallet-pink-action" onClick={closeAfterNavigate}>
                  <span className="text-2xl">↗</span>
                  <span>Отправить</span>
                </Link>
                <Link href="/receive" className="wallet-pink-action" onClick={closeAfterNavigate}>
                  <span className="text-2xl">↙</span>
                  <span>Получить</span>
                </Link>
              </div>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  className="wallet-outline-action"
                  disabled={!activeProfile}
                  onClick={() => void copyAddress()}
                >
                  {copied ? "Адрес скопирован" : "Скопировать адрес"} <span>⧉</span>
                </button>
                <Link href="/wallet" className="wallet-outline-action" onClick={closeAfterNavigate}>
                  Просмотреть портфель <span>→</span>
                </Link>
              </div>

              <section className="mt-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-950">Недавняя активность</h3>
                  <button
                    type="button"
                    className="text-sm font-bold text-violet-700"
                    onClick={() => setView("activity")}
                  >
                    Все
                  </button>
                </div>
                <div className="mt-3 rounded-3xl border border-slate-200/80 bg-white/72 p-4">
                  <div className="flex items-center gap-3">
                    <span className="wallet-activity-icon">A</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-950">
                        {activeProfile ? "Кошелек готов" : "Нет активного кошелька"}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        {activeProfile
                          ? "Swap, send и receive появятся здесь после действий."
                          : "Создайте или импортируйте кошелек для активности."}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="mt-4 grid gap-2">
                <MenuAction
                  href="/settings"
                  icon="S"
                  label="Настройки"
                  detail={`${currency.code} · ${language.nativeName}`}
                  onClick={closeAfterNavigate}
                />
                <MenuAction href="/history" icon="H" label="История действий" onClick={closeAfterNavigate} />
              </div>
            </>
          ) : null}

          {view === "activity" ? (
            <>
              <button type="button" className="wallet-back-button" onClick={() => setView("home")}>
                ← Назад
              </button>
              <h2 className="mt-3 text-2xl font-black text-slate-950">Недавняя активность</h2>
              <div className="mt-4 rounded-3xl border border-slate-200/80 bg-white/72 p-5 text-sm text-slate-600">
                Пока нет локальных действий. После send, receive, swap approval или подключения dApp они появятся здесь.
              </div>
              <Link href="/history" className="wallet-outline-action mt-4" onClick={closeAfterNavigate}>
                Открыть полную историю <span>→</span>
              </Link>
            </>
          ) : null}

          {view === "settings" ? (
            <>
              <button type="button" className="wallet-back-button" onClick={() => setView("home")}>
                ← Назад
              </button>
              <h2 className="mt-3 text-2xl font-black text-slate-950">Настройки</h2>

              <section className="mt-5 space-y-4">
                <div className="wallet-settings-row">
                  <div>
                    <p className="font-black text-slate-950">Тема</p>
                    <p className="text-sm text-slate-500">Авто, светлая или темная схема.</p>
                  </div>
                  <div className="wallet-segmented">
                    {THEME_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        data-active={theme === option.value}
                        onClick={() => setTheme(isAppTheme(option.value) ? option.value : "auto")}
                      >
                        <span>{option.glyph}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="wallet-settings-row">
                  <span>
                    <span className="block font-black text-slate-950">Местная валюта</span>
                    <span className="block text-sm text-slate-500">Отображение сумм и портфеля.</span>
                  </span>
                  <select
                    value={displayCurrency}
                    onChange={(event) => setDisplayCurrency(event.target.value)}
                    className="wallet-menu-select"
                  >
                    {APP_CURRENCIES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code} · {item.symbol}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="wallet-settings-row">
                  <span>
                    <span className="block font-black text-slate-950">Язык</span>
                    <span className="block text-sm text-slate-500">Открыть страницу в переводе.</span>
                  </span>
                  <select
                    value={preferredLanguage}
                    onChange={(event) => setPreferredLanguage(event.target.value)}
                    className="wallet-menu-select"
                  >
                    {APP_LANGUAGES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.nativeName}
                      </option>
                    ))}
                  </select>
                </label>

                <a
                  href={translateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="wallet-outline-action"
                >
                  Перевести через Google Translate <span>↗</span>
                </a>

                <div className="wallet-settings-row">
                  <span>
                    <span className="block font-black text-slate-950">Сбор аналитики</span>
                    <span className="block text-sm text-slate-500">Только обезличенные UX-события.</span>
                  </span>
                  <Toggle checked={analyticsEnabled} onChange={setAnalyticsEnabled} />
                </div>

                <div className="wallet-settings-row">
                  <span>
                    <span className="block font-black text-slate-950">Скрыть малые балансы</span>
                    <span className="block text-sm text-slate-500">Балансы меньше 1 USD скрываются.</span>
                  </span>
                  <Toggle checked={hideSmallBalances} onChange={setHideSmallBalances} />
                </div>

                <div className="wallet-settings-row">
                  <span>
                    <span className="block font-black text-slate-950">Скрыть неизвестные токены</span>
                    <span className="block text-sm text-slate-500">Помогает убрать подозрительные активы.</span>
                  </span>
                  <Toggle checked={hideUnknownTokens} onChange={setHideUnknownTokens} />
                </div>

                <div className="wallet-settings-row">
                  <span>
                    <span className="block font-black text-slate-950">Скрыть отмеченные действия</span>
                    <span className="block text-sm text-slate-500">Spam-транзакции не попадают в ленту.</span>
                  </span>
                  <Toggle checked={hideFlaggedActivity} onChange={setHideFlaggedActivity} />
                </div>
              </section>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

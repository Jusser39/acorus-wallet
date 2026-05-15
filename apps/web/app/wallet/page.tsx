"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { EVM_CHAINS } from "@acorus/shared";
import Link from "next/link";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";
import { updateWalletProfile } from "@/lib/api";
import { loadWalletAssetSnapshot, type TokenBalanceView } from "@/lib/assets";
import { PRACTICE_ADDRESS, PRACTICE_LESSONS } from "@/lib/practice";
import { formatAddress, formatAmount } from "@/lib/utils";

export default function WalletPage() {
  const activeProfile = useActiveProfile();
  const userId = useWalletStore((state) => state.userId);
  const selectedChainId = useWalletStore((state) => state.selectedChainId);
  const setSelectedChainId = useWalletStore((state) => state.setSelectedChainId);
  const unlockedVault = useWalletStore((state) => state.unlockedVault);
  const upsertProfile = useWalletStore((state) => state.upsertProfile);
  const lockWallet = useWalletStore((state) => state.lockWallet);
  const [nativeBalance, setNativeBalance] = useState<string>("0");
  const [tokenBalances, setTokenBalances] = useState<TokenBalanceView[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [hiddenSaving, setHiddenSaving] = useState(false);

  const hiddenBalance = activeProfile?.hiddenBalance ?? false;
  const isLocked = activeProfile?.type === "local" && !unlockedVault;
  const isViewOnly = activeProfile?.type === "view_only";

  useEffect(() => {
    let active = true;

    async function loadBalances() {
      if (!activeProfile) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const snapshot = await loadWalletAssetSnapshot(activeProfile, selectedChainId);

        if (!active) {
          return;
        }

        setNativeBalance(snapshot.nativeBalance);
        setTokenBalances(snapshot.tokens);
      } catch (nextError) {
        if (!active) {
          return;
        }

        setError(
          nextError instanceof Error ? nextError.message : "Не удалось получить балансы.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadBalances();

    return () => {
      active = false;
    };
  }, [activeProfile, refreshNonce, selectedChainId]);

  const chain = useMemo(
    () => EVM_CHAINS.find((item) => item.chainId === selectedChainId) ?? EVM_CHAINS[0]!,
    [selectedChainId],
  );

  async function handleCopyAddress() {
    const value = activeProfile?.publicAddress ?? PRACTICE_ADDRESS;

    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleHiddenBalanceToggle() {
    if (!activeProfile || !userId) {
      return;
    }

    setHiddenSaving(true);
    setError(null);

    try {
      const next = await updateWalletProfile(activeProfile.id, {
        userId,
        hiddenBalance: !hiddenBalance,
      });
      upsertProfile(next);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Не удалось обновить скрытие баланса.",
      );
    } finally {
      setHiddenSaving(false);
    }
  }

  if (!activeProfile) {
    return (
      <section className="page">
        <div className="panel space-y-3">
          <h1 className="text-2xl font-semibold">Нет активного кошелька</h1>
          <p className="text-sm text-slate-300">
            Создайте, импортируйте или добавьте view-only/practice wallet на главной странице.
          </p>
          <Link href="/" className="button-primary inline-flex">
            Go to onboarding
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="space-y-6">
        <div className="panel space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">
                {activeProfile.type.replace("_", " ")}
              </p>
              <h1 className="mt-2 text-3xl font-semibold">{activeProfile.name}</h1>
              <p className="mt-2 text-sm text-slate-300">
                {formatAddress(activeProfile.publicAddress)}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="button-secondary" onClick={() => void handleCopyAddress()}>
                {copied ? "Copied" : "Copy address"}
              </button>
              <Link href="/receive" className="button-secondary">
                Receive
              </Link>
              {isViewOnly ? (
                <button type="button" className="button-primary opacity-60" disabled>
                  Send disabled
                </button>
              ) : (
                <Link href="/send" className="button-primary">
                  Send
                </Link>
              )}
            </div>
          </div>

          {activeProfile.type === "view_only" ? (
            <div className="warning-box text-sm">
              View-only: отправка невозможна, приватного ключа нет.
            </div>
          ) : null}

          {activeProfile.type === "practice" ? (
            <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4 text-sm text-sky-100">
              Practice mode — реальные деньги не используются.
            </div>
          ) : null}

          {isLocked ? (
            <div className="warning-box space-y-3 text-sm">
              <p>Кошелек заблокирован. Для отправки и доступа к mnemonic сначала выполните unlock.</p>
              <Link href="/unlock" className="button-primary inline-flex">
                Unlock wallet
              </Link>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-sm text-slate-400">Native balance · {chain.name}</p>
                <button
                  type="button"
                  className="text-sm text-emerald-300"
                  disabled={hiddenSaving}
                  onClick={() => void handleHiddenBalanceToggle()}
                >
                  {hiddenBalance ? "Show balance" : "Hide balance"}
                </button>
              </div>
              <p className="mt-4 text-4xl font-semibold">
                {hiddenBalance ? "••••" : `${formatAmount(nativeBalance)} ${chain.nativeSymbol}`}
              </p>
              <p className="mt-3 text-sm text-slate-400">
                Предпочитаемая валюта: {activeProfile.preferredCurrency}
              </p>
            </div>
            <div className="panel flex flex-col items-center justify-center gap-3">
              <QRCodeSVG value={activeProfile.publicAddress} size={148} bgColor="transparent" fgColor="#ffffff" />
              <p className="text-center text-xs text-slate-300">
                Receive: отправляйте только активы выбранной сети и проверяйте адрес.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[220px] flex-1 space-y-2">
              <span className="text-sm text-slate-300">Chain</span>
              <select
                value={selectedChainId}
                onChange={(event) => setSelectedChainId(Number(event.target.value))}
              >
                {EVM_CHAINS.map((item) => (
                  <option key={item.chainId} value={item.chainId}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button-secondary"
              disabled={loading}
              onClick={() => setRefreshNonce((value) => value + 1)}
            >
              {loading ? "Refreshing..." : "Refresh balances"}
            </button>
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>

        <div className="panel space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Token balances</h2>
            <Link href="/history" className="text-sm text-emerald-300">
              Open history
            </Link>
          </div>
          <div className="grid gap-3">
            {tokenBalances.length ? (
              tokenBalances.map((token) => (
                <div
                  key={token.tokenAddress}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{token.symbol}</p>
                      <p className="text-sm text-slate-400">{token.name}</p>
                    </div>
                    <p className="text-lg font-semibold">
                      {hiddenBalance ? "••••" : formatAmount(token.balance)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">Для этой сети curated token list пока пуст или балансы равны нулю.</p>
            )}
          </div>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="panel space-y-4">
          <h2 className="text-xl font-semibold">Quick actions</h2>
          <div className="grid gap-3">
            <Link href="/receive" className="button-secondary text-center">
              Receive assets
            </Link>
            {isViewOnly ? (
              <div className="button-primary text-center opacity-60">Send unavailable</div>
            ) : (
              <Link href="/send" className="button-primary text-center">
                Send assets
              </Link>
            )}
            <Link href="/history" className="button-secondary text-center">
              Open history
            </Link>
            <Link href="/contacts" className="button-secondary text-center">
              Manage contacts
            </Link>
            <Link href="/settings" className="button-secondary text-center">
              Wallet settings
            </Link>
            <button type="button" className="button-secondary text-center" onClick={() => lockWallet()}>
              Lock wallet
            </button>
          </div>
        </div>

        <div className="panel space-y-4">
          <h2 className="text-xl font-semibold">Practice lessons</h2>
          <div className="space-y-3 text-sm text-slate-300">
            {PRACTICE_LESSONS.slice(0, 3).map((lesson) => (
              <div key={lesson.id} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="font-medium text-white">{lesson.title}</p>
                <p className="mt-2">{lesson.description}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </section>
  );
}

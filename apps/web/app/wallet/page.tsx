"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { EVM_CHAINS, getCuratedTokens } from "@acorus/shared";
import { getErc20Balance, getNativeBalance } from "@acorus/wallet-core";
import { formatUnits } from "viem";
import Link from "next/link";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";
import { fetchTokens } from "@/lib/api";
import { PRACTICE_ADDRESS, PRACTICE_LESSONS, getPracticeNativeBalance, getPracticeTokens } from "@/lib/practice";
import { formatAddress, formatAmount } from "@/lib/utils";

type TokenBalanceView = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
};

export default function WalletPage() {
  const activeProfile = useActiveProfile();
  const selectedChainId = useWalletStore((state) => state.selectedChainId);
  const setSelectedChainId = useWalletStore((state) => state.setSelectedChainId);
  const unlockedVault = useWalletStore((state) => state.unlockedVault);
  const [nativeBalance, setNativeBalance] = useState<string>("0");
  const [tokenBalances, setTokenBalances] = useState<TokenBalanceView[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hiddenBalance = activeProfile?.hiddenBalance ?? false;
  const isLocked = activeProfile?.type === "local" && !unlockedVault;

  useEffect(() => {
    let active = true;

    async function loadBalances() {
      if (!activeProfile) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (activeProfile.type === "practice") {
          if (!active) {
            return;
          }

          setNativeBalance(getPracticeNativeBalance(selectedChainId));
          setTokenBalances(
            getPracticeTokens(selectedChainId).map((token) => ({
              address: token.tokenAddress,
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals,
              balance: token.balance,
            })),
          );
          return;
        }

        const tokens = await fetchTokens(selectedChainId).catch(() =>
          getCuratedTokens(selectedChainId).map((token) => ({
            id: `${token.chainId}:${token.address.toLowerCase()}`,
            chainId: token.chainId,
            tokenAddress: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            logoUrl: token.logoUrl,
            isVerified: token.verified,
            createdAt: new Date(0).toISOString(),
            updatedAt: new Date(0).toISOString(),
          })),
        );
        const [nativeRaw, tokenRaw] = await Promise.all([
          getNativeBalance(activeProfile.publicAddress as `0x${string}`, selectedChainId),
          Promise.all(
            tokens.map(async (token) => {
              const rawBalance = await getErc20Balance(
                token.tokenAddress as `0x${string}`,
                activeProfile.publicAddress as `0x${string}`,
                selectedChainId,
              );

              return {
                address: token.tokenAddress,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                balance: formatUnits(rawBalance, token.decimals),
              };
            }),
          ),
        ]);

        if (!active) {
          return;
        }

        setNativeBalance(formatUnits(nativeRaw, 18));
        setTokenBalances(tokenRaw);
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
  }, [activeProfile, selectedChainId]);

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
              <Link href="/send" className="button-primary">
                Send
              </Link>
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
              <p className="text-sm text-slate-400">Native balance · {chain.name}</p>
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

          <label className="space-y-2">
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

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {loading ? <p className="text-sm text-slate-400">Refreshing balances...</p> : null}
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
                <div key={token.address} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
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
            <Link href="/send" className="button-primary text-center">
              Send assets
            </Link>
            <Link href="/contacts" className="button-secondary text-center">
              Manage contacts
            </Link>
            <Link href="/settings" className="button-secondary text-center">
              Wallet settings
            </Link>
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

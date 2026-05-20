"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlobalMarketSearch } from "@/components/global-market-search";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";
import { formatAddress } from "@/lib/utils";

const navItems = [
  { href: "/wallet", label: "Wallet" },
  { href: "/swap", label: "Swap" },
  { href: "/send", label: "Send" },
  { href: "/receive", label: "Receive" },
  { href: "/explore", label: "Explore" },
  { href: "/nft", label: "NFTs" },
  { href: "/quests", label: "Quests" },
  { href: "/dapps", label: "dApps" },
  { href: "/security", label: "Security" },
  { href: "/settings", label: "Settings" },
];

export function WalletNav() {
  const pathname = usePathname();
  const activeProfile = useActiveProfile();
  const profiles = useWalletStore((state) => state.profiles);
  const setActiveProfileId = useWalletStore((state) => state.setActiveProfileId);
  const lockWallet = useWalletStore((state) => state.lockWallet);
  const error = useWalletStore((state) => state.error);
  const setError = useWalletStore((state) => state.setError);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-900/6 bg-white/72 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-full border border-slate-900/8 bg-white/82 px-3 py-2 text-sm font-semibold text-slate-950 shadow-[0_14px_34px_rgba(148,163,184,0.18)]"
          >
            <span className="token-orb size-8 text-sm font-black">
              A
            </span>
            <span className="flex flex-col leading-none">
              <span>Acorus</span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.28em] text-slate-500">
                wallet
              </span>
            </span>
          </Link>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 text-sm text-slate-600">
            {activeProfile ? (
              <span className="max-w-full truncate rounded-full border border-slate-900/8 bg-white/82 px-3 py-2 text-xs text-slate-700 shadow-[0_12px_28px_rgba(148,163,184,0.14)]">
                <span className="font-semibold text-slate-950">{activeProfile.name}</span>{" "}
                <span className="text-slate-400">•</span>{" "}
                {activeProfile.chainFamily.toUpperCase()}{" "}
                <span className="text-slate-400">•</span>{" "}
                {formatAddress(activeProfile.publicAddress)}
              </span>
            ) : (
              <span className="rounded-full border border-slate-900/8 bg-white/82 px-3 py-2 text-xs text-slate-700 shadow-[0_12px_28px_rgba(148,163,184,0.14)]">
                No active wallet
              </span>
            )}
            {profiles.length > 0 ? (
              <select
                value={activeProfile?.id ?? ""}
                onChange={(event) => setActiveProfileId(event.target.value || null)}
                aria-label="Select wallet profile"
                className="light-field w-auto min-w-44 rounded-full px-3 py-2 text-xs"
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} · {profile.chainFamily.toUpperCase()} · {profile.type.replace("_", " ")}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              className="rounded-full border border-slate-900/8 bg-white/82 px-4 py-2 text-xs font-semibold text-slate-900 shadow-[0_12px_28px_rgba(148,163,184,0.14)] transition hover:-translate-y-0.5 hover:border-fuchsia-300/30 hover:bg-white"
              onClick={() => lockWallet()}
            >
              Lock
            </button>
          </div>
        </div>
        <div className="flex justify-center">
          <GlobalMarketSearch />
        </div>
        <nav className="flex gap-1 overflow-x-auto rounded-full border border-slate-900/8 bg-white/82 p-1.5 shadow-[0_16px_42px_rgba(148,163,184,0.16)]">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-[linear-gradient(135deg,rgba(255,70,183,0.94),rgba(139,92,246,0.94),rgba(56,189,248,0.94))] text-white shadow-[0_16px_38px_rgba(139,92,246,0.28)]"
                    : "text-slate-700 hover:bg-slate-900/5 hover:text-slate-950"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {error ? (
          <div className="warning-box flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>{error}</span>
            <button
              type="button"
              className="rounded-full border border-rose-300/30 px-3 py-1 text-rose-100"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

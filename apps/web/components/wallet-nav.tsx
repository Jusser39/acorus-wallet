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
    <header className="magic-topbar relative z-40">
      <div className="magic-container flex flex-col gap-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-full border border-white/60 bg-white/62 px-3 py-2 text-sm font-semibold text-slate-950 shadow-[0_14px_34px_rgba(85,166,255,0.15)]"
          >
            <span className="magic-orb size-8 text-sm font-black text-white">
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
              <span className="max-w-full truncate rounded-full border border-white/60 bg-white/62 px-3 py-2 text-xs text-slate-700 shadow-[0_12px_28px_rgba(85,166,255,0.12)]">
                <span className="font-semibold text-slate-950">{activeProfile.name}</span>{" "}
                <span className="text-slate-400">•</span>{" "}
                {activeProfile.chainFamily.toUpperCase()}{" "}
                <span className="text-slate-400">•</span>{" "}
                {formatAddress(activeProfile.publicAddress)}
              </span>
            ) : (
              <span className="rounded-full border border-white/60 bg-white/62 px-3 py-2 text-xs text-slate-700 shadow-[0_12px_28px_rgba(85,166,255,0.12)]">
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
              className="magic-button-secondary px-4 py-2 text-xs transition hover:-translate-y-0.5"
              onClick={() => lockWallet()}
            >
              Lock
            </button>
          </div>
        </div>
        <div className="flex justify-center">
          <GlobalMarketSearch />
        </div>
        <nav className="magic-nav overflow-x-auto p-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                  isActive
                    ? "bg-[linear-gradient(135deg,rgba(124,247,255,0.95),rgba(139,92,246,0.95),rgba(255,122,223,0.95))] text-white shadow-[0_16px_38px_rgba(139,92,246,0.28)]"
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

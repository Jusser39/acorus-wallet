"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/58 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="app-pill inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-white"
          >
            <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-teal-200 via-emerald-300 to-rose-300 text-sm font-black text-slate-950">
              A
            </span>
            <span>Acorus</span>
          </Link>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 text-sm text-slate-300">
            {activeProfile ? (
              <span className="app-pill max-w-full truncate rounded-full px-3 py-2 text-xs text-slate-200">
                <span className="font-semibold text-white">{activeProfile.name}</span>{" "}
                <span className="text-slate-500">/</span>{" "}
                {activeProfile.chainFamily.toUpperCase()}{" "}
                <span className="text-slate-500">/</span>{" "}
                {formatAddress(activeProfile.publicAddress)}
              </span>
            ) : (
              <span className="app-pill rounded-full px-3 py-2 text-xs">
                No active wallet
              </span>
            )}
            {profiles.length > 0 ? (
              <select
                value={activeProfile?.id ?? ""}
                onChange={(event) => setActiveProfileId(event.target.value || null)}
                aria-label="Select wallet profile"
                className="w-auto min-w-44 rounded-full px-3 py-2 text-xs text-white"
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
              className="app-pill rounded-full px-4 py-2 text-xs font-semibold text-white transition hover:border-white/25 hover:bg-white/10"
              onClick={() => lockWallet()}
            >
              Lock
            </button>
          </div>
        </div>
        <nav className="app-pill flex gap-1 overflow-x-auto rounded-full p-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-white text-slate-950 shadow-[0_10px_26px_rgba(255,255,255,0.12)]"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
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

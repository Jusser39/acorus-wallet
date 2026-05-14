"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";
import { formatAddress } from "@/lib/utils";

const navItems = [
  { href: "/wallet", label: "Wallet" },
  { href: "/send", label: "Send" },
  { href: "/history", label: "History" },
  { href: "/contacts", label: "Contacts" },
  { href: "/settings", label: "Settings" },
  { href: "/practice", label: "Practice" },
];

export function WalletNav() {
  const pathname = usePathname();
  const activeProfile = useActiveProfile();
  const lockWallet = useWalletStore((state) => state.lockWallet);

  return (
    <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-lg font-semibold text-white">
            Acorus Wallet
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            {activeProfile ? (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
                {activeProfile.name} · {formatAddress(activeProfile.publicAddress)}
              </span>
            ) : (
              <span className="rounded-full border border-slate-700 px-3 py-1">
                No active wallet
              </span>
            )}
            <button
              type="button"
              className="rounded-full border border-slate-700 px-3 py-1 text-white"
              onClick={() => lockWallet()}
            >
              Lock
            </button>
          </div>
        </div>
        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm ${
                  isActive
                    ? "bg-emerald-500 text-slate-950"
                    : "border border-slate-800 text-slate-300"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

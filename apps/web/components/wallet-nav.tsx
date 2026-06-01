"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";
import { GlobalMarketSearch } from "@/components/global-market-search";
import { WalletAccountMenu } from "@/components/wallet-account-menu";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";

const navItems = [
  { href: "/wallet", label: "Wallet" },
  { href: "/buy", label: "Buy" },
  { href: "/swap", label: "Swap" },
  { href: "/send", label: "Send" },
  { href: "/receive", label: "Receive" },
  { href: "/explore", label: "Explore" },
  { href: "/stake", label: "Stake" },
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
  const unlockedVault = useWalletStore((state) => state.unlockedVault);
  const setActiveProfileId = useWalletStore((state) => state.setActiveProfileId);
  const lockWallet = useWalletStore((state) => state.lockWallet);
  const error = useWalletStore((state) => state.error);
  const setError = useWalletStore((state) => state.setError);
  const isUnlocked = Boolean(unlockedVault);

  const [extensionDetected, setExtensionDetected] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum?.isAcorus) {
      setExtensionDetected(true);
    }
  }, []);

  async function connectExtension() {
    if (!window.ethereum?.isAcorus) return;
    try {
      const accounts = await window.ethereum.request<string[]>({ method: "eth_requestAccounts" });
      const address = accounts[0];
      if (address) {
        const id = `ext_${address}`;
        const existing = useWalletStore.getState().profiles.find((p) => p.id === id);
        if (!existing) {
          useWalletStore.getState().upsertProfile({
            id,
            name: "Extension Wallet",
            type: "injected",
            chainFamily: "evm",
            publicAddress: address,
            userId: "local",
            hiddenBalance: false,
            preferredCurrency: "USD",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        setActiveProfileId(id);
      }
    } catch (e) {
      console.error("Failed to connect extension", e);
    }
  }

  return (
    <header className="relative z-40 border-b border-[var(--border-light)] bg-[var(--surface-base)]">
      <div className="mx-auto w-full max-w-[1200px] flex flex-col gap-3 py-3 px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a
            href="/"
            className="inline-flex items-center gap-2"
          >
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-[var(--accent-primary)] text-white font-bold text-lg">
              A
            </span>
            <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Acorus
            </span>
          </a>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3 text-sm text-[var(--text-primary)]">
            {!activeProfile && extensionDetected && (
              <button
                type="button"
                onClick={connectExtension}
                className="uni-btn-token"
              >
                Connect
              </button>
            )}
            {activeProfile?.type === "injected" && (
              <button
                type="button"
                onClick={() => {
                  const remaining = profiles.filter((p) => p.id !== activeProfile.id);
                  useWalletStore.getState().setProfiles(remaining);
                }}
                className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              >
                Disconnect
              </button>
            )}
            <WalletAccountMenu />
            {profiles.length > 0 ? (
              <select
                value={activeProfile?.id ?? ""}
                onChange={(event) => setActiveProfileId(event.target.value || null)}
                aria-label="Select wallet profile"
                className="bg-[var(--surface-hover)] text-[var(--text-primary)] border-none outline-none w-auto min-w-44 rounded-full px-3 py-2 text-xs"
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
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!isUnlocked}
              onClick={() => lockWallet()}
            >
              {isUnlocked ? "Lock" : "Locked"}
            </button>
          </div>
        </div>
        <div className="flex justify-center">
          <GlobalMarketSearch />
        </div>
        <nav className="flex items-center gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`uni-nav-pill ${isActive ? 'bg-[var(--surface-hover)]' : ''}`}
                data-active={isActive}
              >
                {item.label}
              </a>
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

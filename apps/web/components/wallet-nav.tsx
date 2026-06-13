"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import { GlobalMarketSearch } from "@/components/global-market-search";
import { WalletAccountMenu } from "@/components/wallet-account-menu";
import { useTranslation } from "@/hooks/use-translation";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";

const navItems = [
  { href: "/wallet", translationKey: "nav.wallet" },
  { href: "/buy", label: "Buy" },
  { href: "/swap", translationKey: "nav.swap" },
  { href: "/send", translationKey: "nav.send" },
  { href: "/receive", translationKey: "nav.receive" },
  { href: "/predictions", label: "Predictions" },
  { href: "/explore", translationKey: "nav.explore" },
  { href: "/stake", label: "Stake" },
  { href: "/nft", label: "NFTs" },
  { href: "/quests", label: "Quests" },
  { href: "/dapps", label: "dApps" },
  { href: "/security", translationKey: "nav.security" },
  { href: "/settings", translationKey: "nav.settings" },
];

export function WalletNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const activeProfile = useActiveProfile();
  const profiles = useWalletStore((state) => state.profiles);
  const unlockedVault = useWalletStore((state) => state.unlockedVault);
  const setActiveProfileId = useWalletStore((state) => state.setActiveProfileId);
  const lockWallet = useWalletStore((state) => state.lockWallet);
  const error = useWalletStore((state) => state.error);
  const setError = useWalletStore((state) => state.setError);
  const isUnlocked = Boolean(unlockedVault);

  const [extensionDetected, setExtensionDetected] = useState(false);
  const { scrollY } = useScroll();
  const navBackground = useTransform(
    scrollY,
    [0, 50],
    ["rgba(251, 247, 255, 0)", "rgba(255, 255, 255, 0.72)"]
  );
  const navBorder = useTransform(
    scrollY,
    [0, 50],
    ["rgba(255, 255, 255, 0)", "rgba(217, 70, 239, 0.15)"]
  );
  const navBlur = useTransform(
    scrollY,
    [0, 50],
    ["blur(0px)", "blur(24px)"]
  );

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
      } else {
        useWalletStore.getState().setError("Connection approved, but no EVM accounts were returned by the extension. Please check your extension EVM profiles.");
      }
    } catch (e) {
      console.error("Failed to connect extension", e);
      useWalletStore.getState().setError(e instanceof Error ? e.message : "Failed to connect to extension");
    }
  }

  return (
    <motion.header 
      className="magic-topbar sticky top-0 z-50 transition-all duration-300"
      style={{ 
        background: navBackground, 
        borderBottomWidth: "1px",
        borderBottomColor: navBorder,
        backdropFilter: navBlur,
        WebkitBackdropFilter: navBlur
      }}
    >
      <div className="magic-container flex flex-col gap-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a
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
          </a>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 text-sm text-slate-600">
            {!activeProfile && extensionDetected && (
              <button
                type="button"
                onClick={connectExtension}
                className="magic-button-primary px-4 py-2 text-xs transition hover:-translate-y-0.5"
              >
                Connect Wallet
              </button>
            )}
            {activeProfile?.type === "injected" && (
              <button
                type="button"
                onClick={() => {
                  const remaining = profiles.filter((p) => p.id !== activeProfile.id);
                  useWalletStore.getState().setProfiles(remaining);
                }}
                className="magic-button-secondary px-4 py-2 text-xs transition hover:-translate-y-0.5"
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
              className="magic-button-secondary px-4 py-2 text-xs transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
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
        <nav className="magic-nav overflow-x-auto p-1.5">
          {navItems.filter((item) => item.href !== "/settings" || activeProfile).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                  isActive
                    ? "bg-[linear-gradient(135deg,rgba(124,247,255,0.95),rgba(139,92,246,0.95),rgba(255,122,223,0.95))] text-white shadow-[0_16px_38px_rgba(139,92,246,0.28)]"
                    : "text-slate-700 hover:bg-slate-900/5 hover:text-slate-950"
                }`}
              >
                {item.translationKey ? t(item.translationKey) : item.label}
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
    </motion.header>
  );
}

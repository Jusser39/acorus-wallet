"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useWalletStore } from "@/store/wallet-store";

interface Quest {
  id: string;
  title: string;
  desc: string;
  xp: number;
  icon: string;
  category: string;
  href: string;
  action: string;
  autoDetect?: (params: { hasWallet: boolean; profiles: { type: string }[]; completedEvents: string[] }) => boolean;
}

const QUESTS: Quest[] = [
  {
    id: "q_wallet_created",
    title: "Create your first wallet",
    desc: "Create or import a wallet to get started.",
    xp: 50,
    icon: "🔑",
    category: "Getting started",
    href: "/wallet",
    action: "Create or import wallet",
    autoDetect: ({ hasWallet }) => hasWallet,
  },
  {
    id: "q_receive_address",
    title: "View your receive address",
    desc: "Open the Receive page and copy your address.",
    xp: 15,
    icon: "📬",
    category: "Getting started",
    href: "/receive",
    action: "Open receive",
    autoDetect: ({ completedEvents }) => completedEvents.includes("receive_viewed"),
  },
  {
    id: "q_backup_check",
    title: "Learn about seed phrase security",
    desc: "Read the security guide and understand backup.",
    xp: 20,
    icon: "🛡️",
    category: "Security",
    href: "/security",
    action: "Open security guide",
    autoDetect: ({ completedEvents }) => completedEvents.includes("security_reviewed"),
  },
  {
    id: "q_autolock_set",
    title: "Configure autolock",
    desc: "Set autolock timeout in Settings to protect your wallet.",
    xp: 20,
    icon: "⏱️",
    category: "Security",
    href: "/settings",
    action: "Open settings",
    autoDetect: ({ completedEvents }) => completedEvents.includes("autolock_changed"),
  },
  {
    id: "q_contact_added",
    title: "Add your first contact",
    desc: "Save a wallet address to your contacts.",
    xp: 25,
    icon: "👤",
    category: "Power user",
    href: "/settings",
    action: "Manage contacts",
    autoDetect: ({ completedEvents }) => completedEvents.includes("contact_added"),
  },
  {
    id: "q_swap_preview",
    title: "Preview a swap route",
    desc: "Use the Swap page to preview a route — no real funds needed.",
    xp: 20,
    icon: "🔄",
    category: "DeFi",
    href: "/swap",
    action: "Preview swap",
    autoDetect: ({ completedEvents }) => completedEvents.includes("swap_quote_requested"),
  },
  {
    id: "q_send_draft",
    title: "Create a send draft",
    desc: "Fill out the Send form to preview a transaction.",
    xp: 20,
    icon: "📤",
    category: "DeFi",
    href: "/send",
    action: "Create draft",
    autoDetect: ({ completedEvents }) => completedEvents.includes("send_draft_created"),
  },
  {
    id: "q_practice_wallet",
    title: "Try the practice wallet",
    desc: "Create a practice wallet to learn without real funds.",
    xp: 30,
    icon: "🎓",
    category: "Getting started",
    href: "/practice",
    action: "Open practice",
    autoDetect: ({ completedEvents }) => completedEvents.includes("practice_wallet_started"),
  },
  {
    id: "q_explore_visit",
    title: "Explore the DeFi ecosystem",
    desc: "Visit the Explore page to discover trending tokens.",
    xp: 15,
    icon: "🌐",
    category: "DeFi",
    href: "/explore",
    action: "Explore markets",
    autoDetect: ({ completedEvents }) => completedEvents.includes("explore_opened"),
  },
  {
    id: "q_dapp_connect",
    title: "Learn about dApp connections",
    desc: "Visit the dApps page and explore the extension bridge.",
    xp: 40,
    icon: "🔌",
    category: "Power user",
    href: "/dapps",
    action: "Open dApps",
    autoDetect: ({ completedEvents }) => completedEvents.includes("dapp_opened"),
  },
];

function loadCompletedEvents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("acorus.quests.events") ?? "[]") as string[];
  } catch {
    return [];
  }
}

const CATEGORIES = ["Getting started", "Security", "DeFi", "Power user"];

export default function QuestsPage() {
  const profiles = useWalletStore((state) => state.profiles);
  const hasWallet = profiles.some((profile) => profile.type !== "practice");

  const [completedEvents] = useState<string[]>(loadCompletedEvents);
  const autoCompleted = useMemo(
    () =>
      hasWallet
        ? QUESTS.filter((q) => q.autoDetect?.({ hasWallet, profiles, completedEvents })).map((q) => q.id)
        : [],
    [completedEvents, hasWallet, profiles],
  );

  const completed = useMemo(
    () => [...new Set(autoCompleted)],
    [autoCompleted],
  );

  const totalXp = useMemo(
    () => QUESTS.filter((q) => completed.includes(q.id)).reduce((sum, q) => sum + q.xp, 0),
    [completed],
  );
  const level = Math.floor(totalXp / 100) + 1;
  const levelProgress = totalXp % 100;

  return (
    <section className="page space-y-6">
      {/* Header */}
      <div className="glass-panel space-y-3">
        <p className="text-sm uppercase tracking-[0.22em] text-fuchsia-500">Quests</p>
        <h1 className="text-3xl font-semibold text-slate-950">Learn Web3 by doing</h1>
        <p className="text-sm text-slate-600">
          Complete quests to earn XP and level up your Web3 knowledge — safely, without
          risking real funds.
        </p>
      </div>

      {/* XP / Level bar */}
      <div className="premium-card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-slate-950">Level {level}</span>
          <span className="text-sm text-slate-500">
            {completed.length}/{QUESTS.length} quests complete
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full bg-fuchsia-50 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-sky-400 transition-all duration-500"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <span className="text-sm text-fuchsia-600 tabular-nums w-16 text-right">
            {levelProgress}/100 XP
          </span>
        </div>
        <p className="text-xs text-slate-500">Total XP: {totalXp}</p>
        {!hasWallet ? (
          <p className="rounded-2xl border border-fuchsia-100 bg-white/75 px-3 py-2 text-sm text-slate-600">
            Quest progress starts only after a real wallet is created or imported. Opening pages alone no longer grants XP.
          </p>
        ) : null}
      </div>

      {/* Quest cards by category */}
      {CATEGORIES.map((cat) => {
        const catQuests = QUESTS.filter((q) => q.category === cat);
        return (
          <div key={cat} className="space-y-3">
            <h2 className="text-sm uppercase tracking-widest text-slate-500">{cat}</h2>
            <div className="grid gap-3">
              {catQuests.map((quest) => {
                const done = completed.includes(quest.id);
                return (
                  <div
                    key={quest.id}
                    className={`rounded-2xl border bg-white/80 p-4 shadow-[0_18px_48px_rgba(168,85,247,0.10)] transition-all ${
                      done
                        ? "border-emerald-500/40 border-l-4 border-l-emerald-500 opacity-70"
                        : "border-fuchsia-100"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-2xl">{quest.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-950">{quest.title}</span>
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                            +{quest.xp} XP
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{quest.desc}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {done ? (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-slate-950 text-sm font-bold">
                            ✓
                          </span>
                        ) : (
                          <Link
                            href={quest.href}
                            className="rounded-full border border-fuchsia-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-fuchsia-300 hover:bg-fuchsia-50"
                          >
                            {quest.action}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

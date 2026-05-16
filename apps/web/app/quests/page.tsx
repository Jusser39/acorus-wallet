"use client";

import { useMemo, useState } from "react";
import { useWalletStore } from "@/store/wallet-store";

const STORAGE_KEY = "acorus.quests.completed";

interface Quest {
  id: string;
  title: string;
  desc: string;
  xp: number;
  icon: string;
  category: string;
  autoDetect?: (params: { profiles: { type: string }[]; autoLockMinutes: number }) => boolean;
}

const QUESTS: Quest[] = [
  {
    id: "q_wallet_created",
    title: "Create your first wallet",
    desc: "Create or import a wallet to get started.",
    xp: 50,
    icon: "🔑",
    category: "Getting started",
    autoDetect: ({ profiles }) => profiles.length > 0,
  },
  {
    id: "q_receive_address",
    title: "View your receive address",
    desc: "Open the Receive page and copy your address.",
    xp: 15,
    icon: "📬",
    category: "Getting started",
  },
  {
    id: "q_backup_check",
    title: "Learn about seed phrase security",
    desc: "Read the security guide and understand backup.",
    xp: 20,
    icon: "🛡️",
    category: "Security",
  },
  {
    id: "q_autolock_set",
    title: "Configure autolock",
    desc: "Set autolock timeout in Settings to protect your wallet.",
    xp: 20,
    icon: "⏱️",
    category: "Security",
    autoDetect: ({ autoLockMinutes }) => autoLockMinutes <= 30,
  },
  {
    id: "q_contact_added",
    title: "Add your first contact",
    desc: "Save a wallet address to your contacts.",
    xp: 25,
    icon: "👤",
    category: "Power user",
  },
  {
    id: "q_swap_preview",
    title: "Preview a swap route",
    desc: "Use the Swap page to preview a route — no real funds needed.",
    xp: 20,
    icon: "🔄",
    category: "DeFi",
  },
  {
    id: "q_send_draft",
    title: "Create a send draft",
    desc: "Fill out the Send form to preview a transaction.",
    xp: 20,
    icon: "📤",
    category: "DeFi",
  },
  {
    id: "q_practice_wallet",
    title: "Try the practice wallet",
    desc: "Create a practice wallet to learn without real funds.",
    xp: 30,
    icon: "🎓",
    category: "Getting started",
    autoDetect: ({ profiles }) => profiles.some((p) => p.type === "practice"),
  },
  {
    id: "q_explore_visit",
    title: "Explore the DeFi ecosystem",
    desc: "Visit the Explore page to discover trending tokens.",
    xp: 15,
    icon: "🌐",
    category: "DeFi",
  },
  {
    id: "q_dapp_connect",
    title: "Learn about dApp connections",
    desc: "Visit the dApps page and explore the extension bridge.",
    xp: 40,
    icon: "🔌",
    category: "Power user",
  },
];

function loadManual(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function saveManual(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

const CATEGORIES = ["Getting started", "Security", "DeFi", "Power user"];

export default function QuestsPage() {
  const profiles = useWalletStore((state) => state.profiles);
  const autoLockMinutes = useWalletStore((state) => state.autoLockMinutes);

  // Manually completed quests persisted in localStorage (lazy init avoids SSR issues)
  const [manualCompleted, setManualCompleted] = useState<string[]>(loadManual);

  // Auto-detected quests are computed from current store state — no state needed
  const autoCompleted = useMemo(
    () =>
      QUESTS.filter((q) => q.autoDetect?.({ profiles, autoLockMinutes })).map((q) => q.id),
    [profiles, autoLockMinutes],
  );

  const completed = useMemo(
    () => [...new Set([...manualCompleted, ...autoCompleted])],
    [manualCompleted, autoCompleted],
  );

  function completeQuest(id: string) {
    setManualCompleted((prev) => {
      const next = [...new Set([...prev, id])];
      saveManual(next);
      return next;
    });
  }

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
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Quests</p>
        <h1 className="text-3xl font-semibold text-white">Learn Web3 by doing</h1>
        <p className="text-sm text-slate-300">
          Complete quests to earn XP and level up your Web3 knowledge — safely, without
          risking real funds.
        </p>
      </div>

      {/* XP / Level bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-white">Level {level}</span>
          <span className="text-sm text-slate-400">
            {completed.length}/{QUESTS.length} quests complete
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <span className="text-sm text-emerald-300 tabular-nums w-16 text-right">
            {levelProgress}/100 XP
          </span>
        </div>
        <p className="text-xs text-slate-500">Total XP: {totalXp}</p>
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
                    className={`rounded-2xl border bg-slate-900/80 p-4 shadow-[0_18px_48px_rgba(2,6,23,0.18)] transition-all ${
                      done
                        ? "border-emerald-500/40 border-l-4 border-l-emerald-500 opacity-70"
                        : "border-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-2xl">{quest.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white">{quest.title}</span>
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                            +{quest.xp} XP
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-400">{quest.desc}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {done ? (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-slate-950 text-sm font-bold">
                            ✓
                          </span>
                        ) : !quest.autoDetect ? (
                          <button
                            type="button"
                            onClick={() => completeQuest(quest.id)}
                            className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-500/20"
                          >
                            Complete
                          </button>
                        ) : null}
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
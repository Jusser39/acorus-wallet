"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useWalletStore } from "@/store/wallet-store";

interface Quest {
  id: string;
  title: string;
  desc?: string;
  xp: number;
  category: "Onboarding" | "Top Rewards" | "Learning" | "Socials";
  href?: string;
  action?: string;
  isComingSoon?: boolean;
  isWeekly?: boolean;
  weeklyProgress?: { current: number; max: number; timeLeft: string };
  autoDetect?: (params: { hasWallet: boolean; profiles: { type: string }[]; completedEvents: string[] }) => boolean;
}

const QUESTS: Quest[] = [
  {
    id: "q_wallet_created",
    title: "Create new wallet",
    xp: 50,
    category: "Onboarding",
    href: "/wallet",
    autoDetect: ({ hasWallet }) => hasWallet,
  },
  {
    id: "q_import_wallet",
    title: "Import wallet",
    xp: 30,
    category: "Onboarding",
    href: "/import",
  },
  {
    id: "q_explore_trending",
    title: "Explore Trending Coins",
    xp: 15,
    category: "Onboarding",
    href: "/explore",
    autoDetect: ({ completedEvents }) => completedEvents.includes("explore_opened"),
  },
  {
    id: "q_explore_dapps",
    title: "Explore dApps",
    xp: 20,
    category: "Onboarding",
    href: "/dapps",
    autoDetect: ({ completedEvents }) => completedEvents.includes("dapp_opened"),
  },
  {
    id: "q_change_style",
    title: "Change wallet style",
    xp: 10,
    category: "Onboarding",
    href: "/settings",
  },
  {
    id: "q_enable_notifs",
    title: "Enable notifications",
    xp: 10,
    category: "Onboarding",
    href: "/settings",
  },
  {
    id: "q_make_tx",
    title: "Make 20$ transaction",
    xp: 50,
    category: "Onboarding",
    href: "/swap",
  },
  {
    id: "q_save_seed",
    title: "Save seed phrase",
    xp: 12,
    category: "Onboarding",
    href: "/security",
    autoDetect: ({ completedEvents }) => completedEvents.includes("security_reviewed"),
  },
  {
    id: "q_send_nft",
    title: "Send NFT",
    xp: 100,
    category: "Onboarding",
    href: "/nft",
  },
  {
    id: "q_set_passcode",
    title: "Set passcode",
    xp: 100,
    category: "Onboarding",
    href: "/settings",
    autoDetect: ({ completedEvents }) => completedEvents.includes("autolock_changed"),
  },
  {
    id: "q_biometrics",
    title: "Turn on biometrics",
    xp: 100,
    category: "Onboarding",
    href: "/settings",
  },

  // Top Rewards
  {
    id: "q_weekly",
    title: "Quest of the week",
    desc: "Collect 200 Shards in a week to get 100 bonus Shards",
    xp: 100,
    category: "Top Rewards",
    isWeekly: true,
    weeklyProgress: { current: 0, max: 200, timeLeft: "2d 8h left" },
  },
  {
    id: "q_swap_coins",
    title: "Swap coins",
    desc: "Bigger swap - bigger reward!",
    xp: 75,
    category: "Top Rewards",
    href: "/swap",
  },
  {
    id: "q_buy_coins",
    title: "Buy coins",
    xp: 0,
    category: "Top Rewards",
    isComingSoon: true,
  },
  {
    id: "q_stake_usdt",
    title: "Stake USDT",
    xp: 0,
    category: "Top Rewards",
    isComingSoon: true,
  },

  // Learning
  {
    id: "q_learn_practice",
    title: "Create Practice Wallet",
    xp: 20,
    category: "Learning",
    href: "/practice",
    autoDetect: ({ completedEvents }) => completedEvents.includes("practice_wallet_started"),
  },
  {
    id: "q_learn_receive",
    title: "Receive coin",
    xp: 20,
    category: "Learning",
    href: "/receive",
    autoDetect: ({ completedEvents }) => completedEvents.includes("receive_viewed"),
  },
  {
    id: "q_learn_send",
    title: "Send ETH",
    xp: 20,
    category: "Learning",
    href: "/send",
    autoDetect: ({ completedEvents }) => completedEvents.includes("send_draft_created"),
  },

  // Socials
  {
    id: "q_visit_site",
    title: "Visit Acorus website",
    xp: 30,
    category: "Socials",
    href: "/",
    action: "Go to task ->",
  },
];

function LeafIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400 inline-block ml-0.5">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

export default function QuestsPage() {
  const profiles = useWalletStore((state) => state.profiles);
  const activeProfileId = useWalletStore((state) => state.activeProfileId);
  const hasWallet = profiles.some((profile) => profile.type !== "practice");
  const [mounted, setMounted] = useState(false);
  
  const [completedEvents, setCompletedEvents] = useState<string[]>([]);
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);
  const [streakCount, setStreakCount] = useState(0);
  const [baseShards, setBaseShards] = useState(180);
  const [activeTab, setActiveTab] = useState<"All quests" | "In progress" | "Completed">("All quests");

  const storagePrefix = activeProfileId ? `acorus.quests.${activeProfileId}.` : "acorus.quests.";

  useEffect(() => {
    try {
      if (!hasWallet) {
        setCompletedEvents([]);
        setLastCheckIn(null);
        setStreakCount(0);
        setBaseShards(0);
      } else {
        setCompletedEvents(JSON.parse(localStorage.getItem(`${storagePrefix}events`) ?? "[]"));
        setLastCheckIn(localStorage.getItem(`${storagePrefix}lastCheckIn`));
        setStreakCount(parseInt(localStorage.getItem(`${storagePrefix}streak`) ?? "0", 10));
        setBaseShards(parseInt(localStorage.getItem(`${storagePrefix}shards`) ?? "180", 10));
      }
    } catch {}
    setMounted(true);
  }, [storagePrefix, hasWallet, activeProfileId]);

  const saveState = (shards: number, streak: number, checkIn: string) => {
    setBaseShards(shards);
    setStreakCount(streak);
    setLastCheckIn(checkIn);
    localStorage.setItem(`${storagePrefix}shards`, shards.toString());
    localStorage.setItem(`${storagePrefix}streak`, streak.toString());
    localStorage.setItem(`${storagePrefix}lastCheckIn`, checkIn);
  };


  const autoCompleted = useMemo(
    () =>
      hasWallet
        ? QUESTS.filter((q) => q.autoDetect?.({ hasWallet, profiles, completedEvents })).map((q) => q.id)
        : [],
    [completedEvents, hasWallet, profiles],
  );

  const completed = useMemo(() => [...new Set(autoCompleted)], [autoCompleted]);
  


  const today = new Date().toISOString().split("T")[0]!;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]!;
  
  const canCheckIn = hasWallet && lastCheckIn !== today;

  const handleCheckIn = () => {
    if (!hasWallet) {
      alert("Please connect or import a wallet first to start claiming rewards.");
      return;
    }
    if (!canCheckIn) return;
    
    let newStreak = streakCount;
    if (lastCheckIn === yesterday) {
      newStreak = (streakCount + 1) % 7;
    } else {
      newStreak = 1; // Reset streak if missed a day
    }
    
    const bonus = newStreak === 0 ? 110 : 10; // 100 bonus on 7th day + 10 normal
    saveState(baseShards + bonus, newStreak === 0 ? 7 : newStreak, today);
  };

  const categories = ["Top Rewards", "Onboarding", "Learning", "Socials"] as const;

  if (!mounted) return null;

  return (
    <div className="max-w-xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col items-center pt-6 pb-4">
        <h1 className="text-2xl font-bold text-slate-950 mb-6">Quests</h1>
        
        {/* Tabs */}
        <div className="flex w-full border-b border-slate-100 mb-6">
          {(["All quests", "In progress", "Completed"] as const).map((tab) => (
            <button
              key={tab}
              className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab ? "text-slate-900 border-b-2 border-slate-900" : "text-slate-400"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "All quests" && (
        <div className="space-y-8 px-4">
          
          {/* Daily section */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-fuchsia-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-slate-900">Daily Check-In</span>
                {!canCheckIn && <span className="w-5 h-5 bg-sky-400 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</span>}
              </div>
              <button
                className={`py-2 px-4 rounded-full text-sm font-bold w-full transition-all ${
                  !hasWallet 
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : canCheckIn 
                      ? "bg-sky-400 text-white shadow-[0_4px_12px_rgba(56,189,248,0.3)] hover:scale-105" 
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
                onClick={handleCheckIn}
                disabled={!canCheckIn && hasWallet}
              >
                {!hasWallet ? "Connect Wallet" : canCheckIn ? "Claim 10" : "Claimed"} {hasWallet && canCheckIn && <LeafIcon />}
              </button>
            </div>

            <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-fuchsia-50/50">
              <h3 className="font-semibold text-slate-900 mb-3">7-Day Streak</h3>
              <div className="flex gap-1 mb-4">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full ${hasWallet && i < streakCount ? "bg-sky-400" : "bg-slate-100"}`} />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sky-400 text-sm font-bold bg-sky-50 px-2 py-0.5 rounded-full">
                  +100 <LeafIcon />
                </div>
                {hasWallet ? (
                  <span className="text-xs font-medium text-slate-400">{streakCount}/7</span>
                ) : (
                  <span className="text-xs font-medium text-slate-400">Connect wallet</span>
                )}
              </div>
            </div>
          </div>

          {categories.map((cat) => {
            const catQuests = QUESTS.filter((q) => q.category === cat);
            if (catQuests.length === 0) return null;
            
            return (
              <div key={cat} className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-bold text-slate-900">{cat}</h2>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{catQuests.length} quests</span>
                </div>
                
                <div className="grid gap-2">
                  {catQuests.map((quest) => {
                    const done = completed.includes(quest.id);
                    
                    return (
                      <div key={quest.id} className="bg-white rounded-2xl p-4 shadow-sm border border-fuchsia-50/30 flex items-center justify-between group">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{quest.title}</span>
                            {done && <span className="w-4 h-4 bg-sky-400 text-white rounded-full flex items-center justify-center text-[10px] font-bold">✓</span>}
                          </div>
                          {quest.desc && (
                            <p className="text-xs text-slate-500 mt-1 truncate">{quest.desc}</p>
                          )}
                        </div>
                        
                        <div className="flex-shrink-0">
                          {done ? (
                            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">Claimed</span>
                          ) : quest.isComingSoon ? (
                            <span className="text-xs font-bold text-sky-400 bg-sky-50 px-3 py-1.5 rounded-full">Coming soon!</span>
                          ) : quest.action ? (
                            <Link href={quest.href || "#"} className="text-xs font-bold text-sky-400 flex items-center gap-1">
                              {quest.action}
                            </Link>
                          ) : (
                            <span className="text-xs font-bold text-sky-400 bg-sky-50/50 px-2 py-1 rounded-full group-hover:bg-sky-100 transition-colors">
                              {quest.xp > 0 ? "+" : "up to "}{quest.xp > 0 ? quest.xp : 75} <LeafIcon />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {activeTab !== "All quests" && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <span className="text-4xl mb-4">👻</span>
          <p>More quests appearing soon.</p>
        </div>
      )}
    </div>
  );
}

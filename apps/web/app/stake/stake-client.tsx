"use client";

import { useEffect, useState } from "react";
import { useWalletStore, useActiveProfile } from "@/store/wallet-store";

export interface StakingAsset {
  symbol: string;
  name: string;
  lstSymbol?: string;
  apy: number;
  color: string;
}

const AVAILABLE_ASSETS: StakingAsset[] = [
  { symbol: "ETH", name: "Ethereum", lstSymbol: "wstETH", apy: 3.4, color: "bg-slate-100 text-slate-900" },
  { symbol: "SOL", name: "Solana", lstSymbol: "JitoSOL", apy: 7.2, color: "bg-purple-100 text-purple-900" },
  { symbol: "TRX", name: "Tron", lstSymbol: "sTRX", apy: 4.1, color: "bg-red-100 text-red-900" },
  { symbol: "USDT", name: "Tether", lstSymbol: "sUSDT", apy: 12.5, color: "bg-emerald-100 text-emerald-900" },
];

export function StakeClient() {
  const activeProfile = useActiveProfile();
  const [tab, setTab] = useState<"stake" | "unstake">("stake");
  const [selectedAsset, setSelectedAsset] = useState<StakingAsset>(AVAILABLE_ASSETS[0]!);
  const [amount, setAmount] = useState("");
  const [stakedBalances, setStakedBalances] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (activeProfile) {
      const stored = localStorage.getItem(`acorus.stake.${activeProfile.id}`);
      if (stored) {
        try {
          setStakedBalances(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse staked balances");
        }
      }
    }
  }, [activeProfile]);

  const saveStakedBalance = (symbol: string, newBalance: string) => {
    if (!activeProfile) return;
    const next = { ...stakedBalances, [symbol]: newBalance };
    setStakedBalances(next);
    localStorage.setItem(`acorus.stake.${activeProfile.id}`, JSON.stringify(next));
  };

  const handleAction = () => {
    if (!activeProfile) {
      alert("Please connect or unlock your wallet to stake assets.");
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    const currentStaked = parseFloat(stakedBalances[selectedAsset.symbol] || "0");
    if (tab === "stake") {
      saveStakedBalance(selectedAsset.symbol, (currentStaked + val).toString());
      alert(`Successfully staked ${val} ${selectedAsset.symbol}`);
    } else {
      if (val > currentStaked) {
        alert("Insufficient staked balance");
        return;
      }
      saveStakedBalance(selectedAsset.symbol, (currentStaked - val).toString());
      alert(`Successfully unstaked ${val} ${selectedAsset.symbol}`);
    }
    setAmount("");
  };

  if (!mounted) return null;

  const currentStaked = stakedBalances[selectedAsset.symbol] || "0";

  return (
    <main className="page max-w-xl mx-auto space-y-8 pb-20 pt-6">
      <div className="flex flex-col items-center pb-4">
        <h1 className="text-2xl font-bold text-slate-950 mb-6">Earn (Stake)</h1>

        <div className="w-full premium-card p-2 shadow-xl shadow-fuchsia-500/5 bg-white/72 backdrop-blur-xl">
          {/* Tabs */}
          <div className="flex w-full bg-slate-100/50 p-1 rounded-[1.2rem] mb-4">
            {(["stake", "unstake"] as const).map((t) => (
              <button
                key={t}
                className={`flex-1 py-2.5 text-sm font-bold rounded-[1rem] transition-all ${
                  tab === t 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => {
                  setTab(t);
                  setAmount("");
                }}
              >
                {t === "stake" ? "Stake" : "Unstake"}
              </button>
            ))}
          </div>

          <div className="grid gap-3 rounded-[1.6rem] border border-fuchsia-100 bg-white/72 p-3 shadow-sm">
            <div className="swap-network-field p-2">
              <span className="px-2 text-sm font-medium text-slate-600">Select Asset</span>
              <div className="flex gap-2 overflow-x-auto p-2 no-scrollbar">
                {AVAILABLE_ASSETS.map((asset) => (
                  <button
                    key={asset.symbol}
                    className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl transition-colors border ${
                      selectedAsset.symbol === asset.symbol 
                        ? "border-sky-400 bg-sky-50 text-sky-900" 
                        : "border-slate-100 hover:bg-slate-50 text-slate-700"
                    }`}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${asset.color}`}>
                      {asset.symbol.slice(0, 3)}
                    </div>
                    <span className="font-semibold text-sm">{asset.symbol}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="swap-box relative flex items-center justify-between rounded-[1.2rem] bg-slate-50 p-4 transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-fuchsia-400">
              <div className="flex flex-col">
                <span className="mb-2 text-xs font-semibold text-slate-500">{tab === "stake" ? "Amount to stake" : "Amount to unstake"}</span>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full bg-transparent text-3xl font-black text-slate-900 outline-none placeholder:text-slate-300"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <span className="mt-2 text-xs font-medium text-slate-400">
                  {tab === "unstake" ? `Staked: ${currentStaked} ${selectedAsset.symbol}` : "Available in wallet"}
                </span>
              </div>
            </div>

            <div className="mt-2 rounded-[1.2rem] bg-emerald-50/50 p-4 border border-emerald-100/50 flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Current APY</p>
                <p className="text-2xl font-black text-emerald-500">{selectedAsset.apy}%</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Reward Token</p>
                <p className="text-sm font-bold text-slate-900">{selectedAsset.lstSymbol}</p>
              </div>
            </div>

            <button
              onClick={handleAction}
              disabled={!amount || parseFloat(amount) <= 0 || (tab === "unstake" && parseFloat(amount) > parseFloat(currentStaked))}
              className="mt-2 w-full magic-button-primary py-4 text-base font-bold shadow-[0_8px_20px_rgba(139,92,246,0.2)]"
            >
              {!activeProfile 
                ? "Connect Wallet" 
                : tab === "stake" 
                  ? `Stake ${selectedAsset.symbol}` 
                  : `Unstake ${selectedAsset.symbol}`}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 w-full text-center">
          <p className="text-sm text-slate-500 leading-relaxed">
            Your staked assets generate yield continuously. Rewards are compounded and you can unstake at any time without lockup periods.
          </p>
        </div>
      </div>
    </main>
  );
}

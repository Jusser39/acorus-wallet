"use client";

import { useState } from "react";
import { useWalletStore } from "@/store/wallet-store";
import { StakingModal, type StakingAsset } from "@/components/staking-modal";

const AVAILABLE_ASSETS: StakingAsset[] = [
  { symbol: "ETH", name: "Ethereum", apy: 3.4, lockupDays: 7, color: "bg-slate-800 text-white border-slate-700" },
  { symbol: "SOL", name: "Solana", apy: 7.2, lockupDays: 2, color: "bg-purple-900/50 text-purple-200 border-purple-500/30" },
  { symbol: "ATOM", name: "Cosmos", apy: 18.2, lockupDays: 21, color: "bg-indigo-900/50 text-indigo-200 border-indigo-500/30" },
  { symbol: "DOT", name: "Polkadot", apy: 14.5, lockupDays: 28, color: "bg-pink-900/50 text-pink-200 border-pink-500/30" },
  { symbol: "AVAX", name: "Avalanche", apy: 6.5, lockupDays: 14, color: "bg-red-900/50 text-red-200 border-red-500/30" },
];

// Rough mock prices to calculate "Total Value Locked"
const MOCK_PRICES: Record<string, number> = {
  ETH: 3100.5,
  SOL: 145.2,
  ATOM: 8.4,
  DOT: 7.1,
  AVAX: 35.6,
};

export function StakeClient() {
  const [selectedAsset, setSelectedAsset] = useState<StakingAsset | null>(null);
  const mockStakedBalances = useWalletStore((state) => state.mockStakedBalances);

  // Calculate total staked value
  const totalValueStaked = Object.entries(mockStakedBalances).reduce((total, [symbol, amount]) => {
    return total + amount * (MOCK_PRICES[symbol] ?? 0);
  }, 0);

  const stakedAssets = AVAILABLE_ASSETS.filter((asset) => (mockStakedBalances[asset.symbol] ?? 0) > 0);
  const unstakedAssets = AVAILABLE_ASSETS;

  return (
    <main className="page max-w-3xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="space-y-3 pt-6">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Earn
        </h1>
        <p className="text-slate-400">
          Stake your crypto to secure networks and earn native rewards.
        </p>
      </div>

      {/* Total Staked Card */}
      <div className="relative overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-gradient-to-br from-slate-900 to-emerald-950 p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl"></div>
        
        <div className="relative z-10">
          <p className="text-sm font-medium text-emerald-400 mb-1 uppercase tracking-wider">Total Staked Balance</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl font-black text-white sm:text-5xl">
              ${totalValueStaked.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
          
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 min-w-[140px]">
              <p className="text-xs text-slate-400 mb-1">Total Rewards Earned</p>
              <p className="text-lg font-bold text-emerald-300">
                ${(totalValueStaked * 0.001).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 min-w-[140px]">
              <p className="text-xs text-slate-400 mb-1">Average APY</p>
              <p className="text-lg font-bold text-white">~8.5%</p>
            </div>
          </div>
        </div>
      </div>

      {/* My Staking */}
      {stakedAssets.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">My Staking</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {stakedAssets.map((asset) => {
              const amount = mockStakedBalances[asset.symbol] ?? 0;
              const value = amount * (MOCK_PRICES[asset.symbol] ?? 0);
              
              return (
                <button
                  key={asset.symbol}
                  onClick={() => setSelectedAsset(asset)}
                  className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-800/50 p-4 text-left transition hover:bg-slate-800 hover:border-slate-600"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${asset.color} font-bold text-xs`}>
                      {asset.symbol.slice(0, 3)}
                    </div>
                    <div>
                      <p className="font-bold text-white">{asset.name}</p>
                      <p className="text-xs text-slate-400">{amount.toLocaleString()} {asset.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-400">{asset.apy}% APY</p>
                    <p className="text-xs text-slate-400">${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Available to Stake */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white">Available to Stake</h3>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div className="divide-y divide-slate-800/50">
            {unstakedAssets.map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset)}
                className="flex w-full items-center justify-between p-4 transition hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full border ${asset.color} font-bold text-sm`}>
                    {asset.symbol.slice(0, 3)}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white text-lg">{asset.name}</p>
                    <p className="text-xs text-slate-400">{asset.symbol}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="font-bold text-emerald-400">{asset.apy}% APY</p>
                    <p className="text-xs text-slate-500">{asset.lockupDays}d lockup</p>
                  </div>
                  <div className="text-slate-500">›</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <StakingModal
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        asset={selectedAsset}
      />
    </main>
  );
}

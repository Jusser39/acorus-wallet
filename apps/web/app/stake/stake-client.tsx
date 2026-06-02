"use client";

import { useState } from "react";
import { StakingModal, type StakingAsset } from "@/components/staking-modal";

const AVAILABLE_ASSETS: StakingAsset[] = [
  { symbol: "ETH", name: "Ethereum", lstSymbol: "wstETH", apy: 3.4, color: "bg-slate-100 text-slate-900 border-slate-200" },
  { symbol: "SOL", name: "Solana", lstSymbol: "JitoSOL", apy: 7.2, color: "bg-purple-100 text-purple-900 border-purple-200" },
  { symbol: "ATOM", name: "Cosmos", lstSymbol: "stkATOM", apy: 18.2, color: "bg-indigo-100 text-indigo-900 border-indigo-200" },
  { symbol: "DOT", name: "Polkadot", lstSymbol: "vDOT", apy: 14.5, color: "bg-pink-100 text-pink-900 border-pink-200" },
  { symbol: "AVAX", name: "Avalanche", lstSymbol: "sAVAX", apy: 6.5, color: "bg-red-100 text-red-900 border-red-200" },
];

export function StakeClient() {
  const [selectedAsset, setSelectedAsset] = useState<StakingAsset | null>(null);

  return (
    <main className="page max-w-3xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="space-y-3 pt-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Earn
        </h1>
        <p className="text-slate-500">
          Stake your crypto to secure networks and earn liquid staking rewards.
        </p>
      </div>

      {/* Hero Banner */}
      <div className="app-surface relative overflow-hidden rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-fuchsia-500/5">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-fuchsia-400/10 blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-400/10 blur-3xl"></div>
        </div>
        
        <div className="relative z-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Liquid Staking</h2>
            <p className="mt-2 max-w-md text-sm text-slate-500 leading-relaxed">
              Earn rewards instantly with Liquid Staking Tokens (LSTs). Swap your native assets for LSTs like wstETH or JitoSOL to start earning yield while retaining full liquidity to trade or use in DeFi.
            </p>
          </div>
          <div className="hidden shrink-0 rounded-3xl bg-slate-50 p-4 sm:block border border-slate-100">
            <span className="text-4xl">💧</span>
          </div>
        </div>
      </div>

      {/* Available to Stake */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-900">Available to Stake</h3>
        <div className="rounded-3xl border border-slate-100 bg-white overflow-hidden shadow-lg shadow-slate-200/50">
          <div className="divide-y divide-slate-100">
            {AVAILABLE_ASSETS.map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset)}
                className="flex w-full items-center justify-between p-4 transition hover:bg-slate-50"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full border ${asset.color} font-bold text-sm shadow-sm`}>
                    {asset.symbol.slice(0, 3)}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900 text-lg">{asset.name}</p>
                    <p className="text-xs text-slate-500">Receive {asset.lstSymbol}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="font-bold text-emerald-500">{asset.apy}% APY</p>
                    <p className="text-xs text-slate-400">Instant liquidity</p>
                  </div>
                  <div className="text-slate-400">›</div>
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

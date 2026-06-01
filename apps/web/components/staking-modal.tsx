"use client";

import { useState } from "react";
import { useWalletStore } from "@/store/wallet-store";

export interface StakingAsset {
  symbol: string;
  name: string;
  apy: number;
  lockupDays: number;
  color: string;
}

interface StakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: StakingAsset | null;
}

export function StakingModal({ isOpen, onClose, asset }: StakingModalProps) {
  const [tab, setTab] = useState<"stake" | "unstake">("stake");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const mockStakedBalances = useWalletStore((state) => state.mockStakedBalances);
  const stakeMockAsset = useWalletStore((state) => state.stakeMockAsset);
  const unstakeMockAsset = useWalletStore((state) => state.unstakeMockAsset);

  if (!isOpen || !asset) return null;

  const currentStaked = mockStakedBalances[asset.symbol] ?? 0;
  const numAmount = parseFloat(amount);
  const isValidAmount = !isNaN(numAmount) && numAmount > 0;
  
  // For unstaking, we can't unstake more than we have.
  const hasEnoughToUnstake = tab === "unstake" ? isValidAmount && numAmount <= currentStaked : true;
  const canProceed = isValidAmount && hasEnoughToUnstake && !isProcessing;

  const handleAction = () => {
    if (!canProceed) return;
    setIsProcessing(true);

    // Simulate blockchain delay
    setTimeout(() => {
      if (tab === "stake") {
        stakeMockAsset(asset.symbol, numAmount);
      } else {
        unstakeMockAsset(asset.symbol, numAmount);
      }
      setIsProcessing(false);
      setAmount("");
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm">
      <div 
        className="fixed inset-0" 
        onClick={isProcessing ? undefined : onClose}
      />
      <div className="relative w-full max-w-md transform overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-900 p-6 text-left shadow-[0_22px_60px_rgba(2,6,23,0.3)] transition-all">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold leading-6 text-white flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${asset.color}`}>
              {asset.symbol.slice(0, 3)}
            </div>
            {asset.name} Staking
          </h3>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-full bg-slate-800 p-2 text-slate-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="mt-6">
          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-800/50 p-1 mb-6">
            <button
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                tab === "stake" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"
              }`}
              onClick={() => setTab("stake")}
            >
              Stake
            </button>
            <button
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                tab === "unstake" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"
              }`}
              onClick={() => setTab("unstake")}
            >
              Unstake
            </button>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-3">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Current APY</p>
              <p className="text-lg font-bold text-emerald-400">{asset.apy}%</p>
            </div>
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-3">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Lockup</p>
              <p className="text-lg font-bold text-slate-200">{asset.lockupDays} days</p>
            </div>
          </div>

          {/* Input field */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 focus-within:border-emerald-500/50 transition">
            <div className="flex justify-between mb-1">
              <label className="text-xs font-semibold text-slate-400">
                {tab === "stake" ? "Amount to stake" : "Amount to unstake"}
              </label>
              <span className="text-xs font-semibold text-slate-500">
                Staked: {currentStaked.toLocaleString()} {asset.symbol}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent text-3xl font-bold text-white outline-none placeholder:text-slate-600"
                disabled={isProcessing}
              />
              <span className="text-lg font-bold text-slate-400">{asset.symbol}</span>
            </div>
            {tab === "unstake" && currentStaked > 0 && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setAmount(currentStaked.toString())}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                >
                  Max
                </button>
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              type="button"
              disabled={!canProceed}
              onClick={handleAction}
              className="w-full rounded-2xl bg-emerald-500 py-4 text-center font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] transition hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? "Processing..." : tab === "stake" ? `Stake ${asset.symbol}` : `Unstake ${asset.symbol}`}
            </button>
          </div>
          
          {/* TrustWallet style secure note */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
            <span className="opacity-70">🔒</span>
            <p>Secured by Acorus Smart Contracts</p>
          </div>
        </div>
      </div>
    </div>
  );
}

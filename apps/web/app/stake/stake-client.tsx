"use client";

import { useEffect, useState, useMemo } from "react";
import { useActiveProfile } from "@/store/wallet-store";
import { requestAcorusProviderDiscovery, requestAcorusExtension } from "@/lib/extension-bridge";
import { CheckCircle2, AlertCircle, Info, TrendingUp, ShieldCheck, Activity, Layers } from "lucide-react";

type StakingCategory = "liquid" | "native" | "lending" | "restaking";

export interface StakingAsset {
  id: string;
  symbol: string;
  name: string;
  category: StakingCategory;
  provider: string;
  lstSymbol?: string;
  apy: number;
  color: string;
  logoText: string;
}

const CATEGORIES: { id: StakingCategory; label: string; icon: React.ElementType }[] = [
  { id: "liquid", label: "Liquid Staking", icon: Activity },
  { id: "native", label: "Native Stake", icon: ShieldCheck },
  { id: "lending", label: "Lending", icon: TrendingUp },
  { id: "restaking", label: "Restaking", icon: Layers },
];

const AVAILABLE_ASSETS: StakingAsset[] = [
  // Liquid Staking
  { id: "eth-lido", symbol: "ETH", name: "Ethereum", category: "liquid", provider: "Lido", lstSymbol: "stETH", apy: 3.4, color: "bg-blue-100 text-blue-900 border-blue-200", logoText: "ETH" },
  { id: "eth-rocket", symbol: "ETH", name: "Ethereum", category: "liquid", provider: "RocketPool", lstSymbol: "rETH", apy: 3.1, color: "bg-orange-100 text-orange-900 border-orange-200", logoText: "ETH" },
  { id: "sol-jito", symbol: "SOL", name: "Solana", category: "liquid", provider: "Jito", lstSymbol: "JitoSOL", apy: 7.4, color: "bg-purple-100 text-purple-900 border-purple-200", logoText: "SOL" },
  { id: "sol-marinade", symbol: "SOL", name: "Solana", category: "liquid", provider: "Marinade", lstSymbol: "mSOL", apy: 6.9, color: "bg-emerald-100 text-emerald-900 border-emerald-200", logoText: "SOL" },
  { id: "matic-lido", symbol: "MATIC", name: "Polygon", category: "liquid", provider: "Lido", lstSymbol: "stMATIC", apy: 4.2, color: "bg-indigo-100 text-indigo-900 border-indigo-200", logoText: "POL" },
  
  // Native
  { id: "atom-native", symbol: "ATOM", name: "Cosmos", category: "native", provider: "Native Validators", lstSymbol: "Staked ATOM", apy: 14.5, color: "bg-slate-800 text-slate-100 border-slate-700", logoText: "ATM" },
  { id: "tia-native", symbol: "TIA", name: "Celestia", category: "native", provider: "Native Validators", lstSymbol: "Staked TIA", apy: 11.2, color: "bg-violet-100 text-violet-900 border-violet-200", logoText: "TIA" },
  { id: "trx-native", symbol: "TRX", name: "Tron", category: "native", provider: "Super Representatives", lstSymbol: "Staked TRX", apy: 4.1, color: "bg-red-100 text-red-900 border-red-200", logoText: "TRX" },
  { id: "avax-native", symbol: "AVAX", name: "Avalanche", category: "native", provider: "Native Validators", lstSymbol: "Staked AVAX", apy: 6.8, color: "bg-red-200 text-red-900 border-red-300", logoText: "AVX" },
  
  // Lending
  { id: "usdc-aave", symbol: "USDC", name: "USD Coin", category: "lending", provider: "Aave V3", lstSymbol: "aUSDC", apy: 8.5, color: "bg-sky-100 text-sky-900 border-sky-200", logoText: "USC" },
  { id: "usdt-aave", symbol: "USDT", name: "Tether", category: "lending", provider: "Aave V3", lstSymbol: "aUSDT", apy: 10.2, color: "bg-emerald-100 text-emerald-900 border-emerald-200", logoText: "UST" },
  
  // Restaking
  { id: "steth-eigen", symbol: "stETH", name: "Lido stETH", category: "restaking", provider: "EigenLayer", lstSymbol: "e-stETH", apy: 12.4, color: "bg-cyan-100 text-cyan-900 border-cyan-200", logoText: "stE" },
];

export function StakeClient() {
  const activeProfile = useActiveProfile();
  const [tab, setTab] = useState<"stake" | "unstake">("stake");
  const [selectedCategory, setSelectedCategory] = useState<StakingCategory>("liquid");
  
  const filteredAssets = useMemo(() => AVAILABLE_ASSETS.filter(a => a.category === selectedCategory), [selectedCategory]);
  
  const [selectedAsset, setSelectedAsset] = useState<StakingAsset>(filteredAssets[0]!);
  const [amount, setAmount] = useState("");
  const [stakedBalances, setStakedBalances] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    setMounted(true);
    requestAcorusProviderDiscovery();
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

  useEffect(() => {
    setSelectedAsset(filteredAssets[0]!);
    setAmount("");
  }, [selectedCategory, filteredAssets]);

  const saveStakedBalance = (assetId: string, newBalance: string) => {
    if (!activeProfile) return;
    const next = { ...stakedBalances, [assetId]: newBalance };
    setStakedBalances(next);
    localStorage.setItem(`acorus.stake.${activeProfile.id}`, JSON.stringify(next));
  };

  const handleAction = async () => {
    if (!activeProfile) {
      try {
        await requestAcorusExtension<string[]>("acorus_requestAccounts", [{ family: "evm" }]);
      } catch (err) {
        showToast("Please unlock your Acorus wallet extension or install it to continue.", "error");
      }
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    const currentStaked = parseFloat(stakedBalances[selectedAsset.id] || "0");
    if (tab === "stake") {
      saveStakedBalance(selectedAsset.id, (currentStaked + val).toString());
      showToast(`Successfully staked ${val} ${selectedAsset.symbol} via ${selectedAsset.provider}`, "success");
    } else {
      if (val > currentStaked) {
        showToast("Insufficient staked balance", "error");
        return;
      }
      saveStakedBalance(selectedAsset.id, (currentStaked - val).toString());
      showToast(`Successfully unstaked ${val} ${selectedAsset.symbol} from ${selectedAsset.provider}`, "success");
    }
    setAmount("");
  };

  if (!mounted) return null;

  const currentStaked = stakedBalances[selectedAsset.id] || "0";
  const isValidAmount = amount && parseFloat(amount) > 0;
  const isUnstakeDisabled = tab === "unstake" && (!isValidAmount || parseFloat(amount) > parseFloat(currentStaked));

  return (
    <main className="page max-w-2xl mx-auto space-y-8 pb-20 pt-6 px-4">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl bg-white border border-slate-100 animate-in fade-in slide-in-from-top-10">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          <span className="text-sm font-bold text-slate-800">{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col items-center pb-4">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Earn Yield</h1>
        <p className="text-slate-500 font-medium mb-8 text-center max-w-md">
          Deposit your assets into various protocols to earn continuous APY with no lockups.
        </p>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  isActive
                    ? "bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/20"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-fuchsia-200 hover:text-fuchsia-600"
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="w-full premium-card p-3 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[2rem]">
          {/* Tabs */}
          <div className="flex w-full bg-slate-100/50 p-1.5 rounded-[1.5rem] mb-4">
            {(["stake", "unstake"] as const).map((t) => (
              <button
                key={t}
                className={`flex-1 py-3 text-sm font-bold rounded-[1.2rem] transition-all ${
                  tab === t 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
                onClick={() => {
                  setTab(t);
                  setAmount("");
                }}
              >
                {t === "stake" ? "Deposit" : "Withdraw"}
              </button>
            ))}
          </div>

          <div className="grid gap-3 rounded-[1.6rem] border border-slate-100 bg-white p-3 shadow-sm">
            {/* Asset Selector */}
            <div className="p-2">
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-sm font-bold text-slate-700">Select Protocol</span>
              </div>
              <div className="flex gap-2 overflow-x-auto p-1 pb-3 no-scrollbar snap-x">
                {filteredAssets.map((asset) => (
                  <button
                    key={asset.id}
                    className={`flex-shrink-0 flex flex-col items-start gap-3 p-3 rounded-2xl transition-all border snap-start min-w-[140px] ${
                      selectedAsset?.id === asset.id 
                        ? "border-fuchsia-400 bg-fuchsia-50/50 ring-2 ring-fuchsia-400/20 shadow-sm" 
                        : "border-slate-100 hover:border-slate-200 bg-slate-50/50"
                    }`}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <div className="flex justify-between w-full items-start">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black border ${asset.color}`}>
                        {asset.logoText}
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {asset.apy}%
                      </span>
                    </div>
                    <div className="text-left w-full">
                      <span className="block font-bold text-slate-900">{asset.symbol}</span>
                      <span className="block text-xs font-medium text-slate-500 truncate">{asset.provider}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Box */}
            {selectedAsset && (
              <div className="swap-box relative flex flex-col justify-between rounded-[1.4rem] bg-slate-50 p-5 transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-fuchsia-400 border border-transparent focus-within:border-fuchsia-100">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-slate-600">
                    {tab === "stake" ? "Amount to deposit" : "Amount to withdraw"}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setAmount(tab === "stake" ? "10" : currentStaked)}
                      className="text-xs font-bold bg-slate-200/60 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-md transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    placeholder="0.0"
                    className="w-full bg-transparent text-4xl font-black text-slate-900 outline-none placeholder:text-slate-300"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
                    <span className="font-black text-slate-800">{selectedAsset.symbol}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-200/60 flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-500">
                    {tab === "unstake" ? "Deposited Balance" : "Available to deposit"}
                  </span>
                  <span className="text-sm font-black text-slate-800">
                    {tab === "unstake" ? currentStaked : "0.00"} {selectedAsset.symbol}
                  </span>
                </div>
              </div>
            )}

            {/* Stats Box */}
            {selectedAsset && (
              <div className="mt-1 rounded-[1.4rem] bg-gradient-to-br from-slate-50 to-white p-5 border border-slate-100 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> Current APY
                  </span>
                  <span className="text-base font-black text-emerald-500">{selectedAsset.apy}%</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                    <Info className="w-4 h-4" /> You will receive
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {amount && parseFloat(amount) > 0 ? amount : "0"} {selectedAsset.lstSymbol}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleAction}
              disabled={!isValidAmount || isUnstakeDisabled}
              className="mt-2 w-full magic-button-primary py-4.5 rounded-2xl text-lg font-black shadow-[0_8px_25px_rgba(139,92,246,0.25)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {!activeProfile 
                ? "Connect Wallet" 
                : tab === "stake" 
                  ? `Deposit ${selectedAsset?.symbol || ""}` 
                  : `Withdraw ${selectedAsset?.symbol || ""}`}
            </button>
          </div>
        </div>

        <div className="mt-8 w-full px-4">
          <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-4 flex gap-3 text-sky-900">
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-sky-600" />
            <p className="text-sm font-medium leading-relaxed">
              Deposits are simulated securely in your local storage. In a production environment, this would interact directly with smart contracts like Lido, Aave, or Native validators.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

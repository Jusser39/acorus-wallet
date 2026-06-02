"use client";

import { useRouter } from "next/navigation";

export interface StakingAsset {
  symbol: string;
  name: string;
  lstSymbol?: string;
  apy: number;
  lockupDays?: number;
  color: string;
}

interface StakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: StakingAsset | null;
}

export function StakingModal({ isOpen, onClose, asset }: StakingModalProps) {
  const router = useRouter();

  if (!isOpen || !asset) return null;

  const handleAction = () => {
    // Redirect to swap with pre-filled tokens if supported, or just swap page
    router.push(`/swap?from=${asset.symbol}&to=${asset.lstSymbol}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-md transform overflow-hidden rounded-[2rem] bg-white p-6 text-left shadow-2xl transition-all">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black leading-6 text-slate-950 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${asset.color} shadow-sm`}>
              {asset.symbol.slice(0, 3)}
            </div>
            {asset.name} Staking
          </h3>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 hover:text-slate-900 transition"
          >
            ✕
          </button>
        </div>

        <div className="mt-6">
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Convert your <strong>{asset.symbol}</strong> to <strong>{asset.lstSymbol}</strong> to earn staking rewards continuously. Your balance will grow automatically, and you can swap back at any time.
          </p>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Current APY</p>
              <p className="text-2xl font-black text-emerald-500">{asset.apy}%</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Liquidity</p>
              <p className="text-xl font-bold text-slate-900 mt-1">Instant</p>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleAction}
              className="w-full rounded-2xl bg-emerald-500 py-4 text-center font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              Get {asset.lstSymbol} via Swap
            </button>
          </div>
          
          {/* TrustWallet style secure note */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
            <span className="opacity-70">🔒</span>
            <p>Powered by Secure 0x Routing</p>
          </div>
        </div>
      </div>
    </div>
  );
}

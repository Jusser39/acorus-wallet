import React, { useState, useEffect } from "react";
import { ArrowDownUp, Settings as SettingsIcon, ArrowLeft, CheckCircle2 } from "lucide-react";

export function Swap({ onBack }: { onBack?: () => void }) {
  const [fromAsset, setFromAsset] = useState("ETH");
  const [toAsset, setToAsset] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [success, setSuccess] = useState(false);

  // Auto-fetch mock quote based on rates
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      const rates: Record<string, number> = { ETH: 3200, BTC: 65000, SOL: 150, USDC: 1, USDT: 1 };
      const fromRate = rates[fromAsset] || 1;
      const toRate = rates[toAsset] || 1;
      
      const valueUsd = parseFloat(amount) * fromRate;
      const estimatedOut = (valueUsd / toRate) * 0.99; // 1% slippage
      
      setQuote(estimatedOut.toFixed(toAsset === "USDC" || toAsset === "USDT" ? 2 : 5));
      setLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [amount, fromAsset, toAsset]);

  const handleSwap = () => {
    setSwapping(true);
    setTimeout(() => {
      setSwapping(false);
      setSuccess(true);
      setTimeout(() => {
        if (onBack) onBack();
      }, 2000);
    }, 1500);
  };

  const handleAssetChange = (type: "from" | "to") => {
    // Cycle through mock assets
    const assets = ["ETH", "BTC", "SOL", "USDC"];
    if (type === "from") {
      const next = assets[(assets.indexOf(fromAsset) + 1) % assets.length]!;
      setFromAsset(next);
      if (next === toAsset) setToAsset(assets[(assets.indexOf(next) + 1) % assets.length]!);
    } else {
      const next = assets[(assets.indexOf(toAsset) + 1) % assets.length]!;
      setToAsset(next);
      if (next === fromAsset) setFromAsset(assets[(assets.indexOf(next) + 1) % assets.length]!);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col h-full bg-white relative items-center justify-center">
        <CheckCircle2 className="w-20 h-20 text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Swap Successful</h2>
        <p className="text-slate-500 font-medium text-center px-8">
          You swapped {amount} {fromAsset} for {quote} {toAsset}.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative pb-4">
      <header className="flex items-center justify-between p-4 bg-white border-b border-slate-100">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h2 className="text-lg font-bold text-slate-900">Swap</h2>
        <button className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <SettingsIcon className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="relative flex flex-col gap-2 mt-4">
          {/* From Input */}
          <div className="magic-panel p-4 flex flex-col gap-2 relative bg-white rounded-2xl">
            <span className="text-sm font-semibold text-slate-500">You pay</span>
            <div className="flex items-center justify-between">
              <input 
                type="number" 
                placeholder="0" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-transparent text-4xl font-black outline-none w-1/2 placeholder:text-slate-300"
              />
              <button 
                onClick={() => handleAssetChange("from")}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-full font-bold transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs">
                  {fromAsset.charAt(0)}
                </div>
                {fromAsset}
              </button>
            </div>
          </div>

          {/* Swap Button Divider */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <button 
              className="w-10 h-10 bg-white border-2 border-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-violet-600 hover:shadow-lg transition-all"
              onClick={() => {
                setFromAsset(toAsset);
                setToAsset(fromAsset);
                setAmount(quote || "");
              }}
            >
              <ArrowDownUp className="w-5 h-5" />
            </button>
          </div>

          {/* To Input */}
          <div className="magic-panel p-4 flex flex-col gap-2 bg-white rounded-2xl">
            <span className="text-sm font-semibold text-slate-500">You receive</span>
            <div className="flex items-center justify-between">
              <input 
                type="text" 
                placeholder="0" 
                value={loading ? "..." : quote || ""}
                readOnly
                className="bg-transparent text-4xl font-black outline-none w-1/2 placeholder:text-slate-300"
              />
              <button 
                onClick={() => handleAssetChange("to")}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-full font-bold transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                  {toAsset.charAt(0)}
                </div>
                {toAsset}
              </button>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSwap}
          className="mt-auto w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          disabled={!amount || !quote || loading || swapping}
        >
          {swapping ? "Executing Swap..." : "Review swap"}
        </button>
      </div>
    </div>
  );
}

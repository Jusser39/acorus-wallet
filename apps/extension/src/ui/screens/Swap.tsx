import React, { useState } from "react";
import { ArrowDownUp, Settings } from "lucide-react";

export function Swap() {
  const [fromAsset, setFromAsset] = useState("SOL");
  const [toAsset, setToAsset] = useState("USDC");
  const [amount, setAmount] = useState("");

  const handleSwap = () => {
    // We would integrate the actual swap quote API here
    alert(`Swapping ${amount} ${fromAsset} to ${toAsset}`);
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2 px-2">
        <h2 className="text-xl font-bold">Swap</h2>
        <button className="text-slate-400 hover:text-slate-600">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="relative flex flex-col gap-2">
        {/* From Input */}
        <div className="magic-panel p-4 flex flex-col gap-2 relative">
          <span className="text-sm font-semibold text-slate-500">You pay</span>
          <div className="flex items-center justify-between">
            <input 
              type="number" 
              placeholder="0.0" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent text-3xl font-black outline-none w-1/2 placeholder:text-slate-300"
            />
            <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-full font-bold transition-colors">
              <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs">
                {fromAsset.charAt(0)}
              </div>
              {fromAsset}
            </button>
          </div>
          <div className="text-xs font-medium text-slate-400">$0.00</div>
        </div>

        {/* Swap Button Divider */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <button 
            className="w-10 h-10 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-violet-600 hover:shadow-lg transition-all"
            onClick={() => {
              setFromAsset(toAsset);
              setToAsset(fromAsset);
            }}
          >
            <ArrowDownUp className="w-5 h-5" />
          </button>
        </div>

        {/* To Input */}
        <div className="magic-panel p-4 flex flex-col gap-2 relative">
          <span className="text-sm font-semibold text-slate-500">You receive</span>
          <div className="flex items-center justify-between">
            <input 
              type="number" 
              placeholder="0.0" 
              disabled
              className="bg-transparent text-3xl font-black outline-none w-1/2 text-slate-400"
            />
            <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-full font-bold transition-colors">
              <div className="w-6 h-6 rounded-full bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center text-xs">
                {toAsset.charAt(0)}
              </div>
              {toAsset}
            </button>
          </div>
          <div className="text-xs font-medium text-slate-400">$-.--</div>
        </div>
      </div>

      <button 
        onClick={handleSwap}
        disabled={!amount}
        className="w-full mt-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {amount ? "Review Swap" : "Enter amount"}
      </button>
    </div>
  );
}

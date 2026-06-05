import React, { useState } from "react";
import { ArrowDownUp, Settings as SettingsIcon, ArrowLeft } from "lucide-react";

export function Swap({ onBack }: { onBack?: () => void }) {
  const [fromAsset, setFromAsset] = useState("SOL");
  const [toAsset, setToAsset] = useState("USDC");
  const [amount, setAmount] = useState("");

  const handleSwap = () => {
    // We would integrate the actual swap quote API here
    alert(`Swapping ${amount} ${fromAsset} to ${toAsset}`);
  };

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
          <div className="magic-panel p-4 flex flex-col gap-2 relative bg-white">
            <span className="text-sm font-semibold text-slate-500">You pay</span>
            <div className="flex items-center justify-between">
              <input 
                type="number" 
                placeholder="0" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-transparent text-4xl font-black outline-none w-1/2 placeholder:text-slate-300"
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
              className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-violet-600 hover:shadow-lg transition-all"
              onClick={() => {
                setFromAsset(toAsset);
                setToAsset(fromAsset);
              }}
            >
              <ArrowDownUp className="w-5 h-5" />
            </button>
          </div>

          {/* To Input */}
          <div className="magic-panel p-4 flex flex-col gap-2 bg-white">
            <span className="text-sm font-semibold text-slate-500">You receive</span>
            <div className="flex items-center justify-between">
              <input 
                type="number" 
                placeholder="0" 
                readOnly
                className="bg-transparent text-4xl font-black outline-none w-1/2 placeholder:text-slate-300"
              />
              <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-full font-bold transition-colors">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                  {toAsset.charAt(0)}
                </div>
                {toAsset}
              </button>
            </div>
            <div className="text-xs font-medium text-slate-400">$0.00</div>
          </div>
        </div>

        <button 
          onClick={handleSwap}
          className="mt-auto w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          disabled={!amount}
        >
          Review swap
        </button>
      </div>
    </div>
  );
}

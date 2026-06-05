import React, { useState } from "react";
import { ArrowLeft, CreditCard, Apple, ArrowRight } from "lucide-react";

export function Buy({ onBack }: { onBack?: () => void }) {
  const [fiatAmount, setFiatAmount] = useState("");
  const [cryptoAsset, setCryptoAsset] = useState("ETH");
  const [fiatCurrency, setFiatCurrency] = useState("USD");

  const cryptoRate = 3500; // Mock ETH rate
  const cryptoAmount = fiatAmount ? (Number(fiatAmount) / cryptoRate).toFixed(4) : "0.0000";

  return (
    <div className="flex flex-col h-full bg-slate-50 relative pb-4">
      <header className="flex items-center justify-between p-4 bg-white border-b border-slate-100">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h2 className="text-lg font-bold text-slate-900">Buy Crypto</h2>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Input Card */}
        <div className="magic-panel p-4 flex flex-col gap-2 bg-white mt-4 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-500">You pay</span>
            <button className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full text-sm font-bold transition-colors text-slate-800">
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">$</span>
              {fiatCurrency}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-4xl font-black text-slate-400 select-none">$</span>
            <input 
              type="number" 
              placeholder="0" 
              value={fiatAmount}
              onChange={(e) => setFiatAmount(e.target.value)}
              className="bg-transparent text-5xl font-black outline-none w-full text-right placeholder:text-slate-300 ml-2"
              autoFocus
            />
          </div>
        </div>

        {/* Output Card */}
        <div className="magic-panel p-4 flex flex-col gap-2 bg-white relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-500">You receive (approx)</span>
            <button className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full text-sm font-bold transition-colors text-slate-800">
              <img src="/icons/eth.svg" className="w-4 h-4" alt="ETH" />
              {cryptoAsset}
            </button>
          </div>
          <div className="flex items-center justify-end">
            <span className="text-3xl font-black text-slate-800 tracking-tight">
              {cryptoAmount}
            </span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="flex flex-col gap-2 mt-2">
          <h3 className="text-sm font-bold text-slate-800 px-1 mb-1">Payment Method</h3>
          
          <button className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-violet-500 hover:shadow-sm transition-all text-left group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-700">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900">Card</span>
                <span className="text-xs font-semibold text-slate-500">Visa, Mastercard</span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-violet-500" />
          </button>

          <button className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-violet-500 hover:shadow-sm transition-all text-left group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white">
                <Apple className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900">Apple Pay</span>
                <span className="text-xs font-semibold text-slate-500">Fast checkout</span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-violet-500" />
          </button>
        </div>

        <button 
          className="mt-6 w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold text-lg shadow-[0_8px_20px_-4px_rgba(124,58,237,0.4)] hover:shadow-xl transition-all disabled:opacity-50 disabled:shadow-none"
          disabled={!fiatAmount || Number(fiatAmount) <= 0}
        >
          Continue to Provider
        </button>
      </div>
    </div>
  );
}

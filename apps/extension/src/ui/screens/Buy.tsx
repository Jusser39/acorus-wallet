import React, { useState, useEffect } from "react";
import { ArrowLeft, CreditCard, Apple, ArrowRight } from "lucide-react";
import { getBackgroundState } from "../api";
import type { BackgroundStateSnapshot } from "../../shared/protocol";

export function Buy({ onBack }: { onBack?: () => void }) {
  const [fiatAmount, setFiatAmount] = useState("");
  const [cryptoAsset, setCryptoAsset] = useState("ETH");
  const [fiatCurrency, setFiatCurrency] = useState("USD");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "apple_pay">("card");
  const [bgState, setBgState] = useState<BackgroundStateSnapshot | null>(null);

  useEffect(() => {
    getBackgroundState().then((state) => {
      if (state) setBgState(state);
    });
  }, []);

  const cryptoRate = 3820; // Example live rate
  const cryptoAmount = fiatAmount ? (Number(fiatAmount) / cryptoRate).toFixed(4) : "0.0000";
  const activeProfile = bgState?.extensionVaultStatus?.profiles?.[0];

  const handleBuy = () => {
    if (!fiatAmount || Number(fiatAmount) <= 0) return;
    
    // Construct real Transak URL
    const baseUrl = "https://global.transak.com/";
    const params = new URLSearchParams({
      fiatCurrency,
      defaultFiatAmount: fiatAmount,
      cryptoCurrencyList: cryptoAsset,
      network: cryptoAsset === "SOL" ? "solana" : cryptoAsset === "BTC" ? "bitcoin" : "ethereum",
      defaultPaymentMethod: paymentMethod === "apple_pay" ? "apple_pay" : "credit_debit_card",
    });
    
    if (activeProfile?.account) {
      params.append("walletAddress", activeProfile.account);
    }
    
    window.open(`${baseUrl}?${params.toString()}`, "_blank");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative pb-4">
      <header className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Buy Crypto</h2>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Input Card */}
        <div className="magic-panel p-4 flex flex-col gap-2 bg-white dark:bg-slate-950 mt-4 relative border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">You pay</span>
            <button className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-full text-sm font-bold transition-colors text-slate-800 dark:text-slate-200">
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">$</span>
              {fiatCurrency}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-4xl font-black text-slate-400 dark:text-slate-500 select-none">$</span>
            <input 
              type="number" 
              placeholder="0" 
              value={fiatAmount}
              onChange={(e) => setFiatAmount(e.target.value)}
              className="bg-transparent text-5xl font-black outline-none w-full text-right placeholder:text-slate-300 dark:placeholder:text-slate-600 ml-2 text-slate-900 dark:text-white"
              autoFocus
            />
          </div>
        </div>

        {/* Output Card */}
        <div className="magic-panel p-4 flex flex-col gap-2 bg-white dark:bg-slate-950 relative overflow-hidden border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">You receive (approx)</span>
            <button className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-full text-sm font-bold transition-colors text-slate-800 dark:text-slate-200">
              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold">E</div>
              {cryptoAsset}
            </button>
          </div>
          <div className="flex items-center justify-end">
            <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
              {cryptoAmount}
            </span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="flex flex-col gap-2 mt-2">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 px-1 mb-1">Payment Method</h3>
          
          <button 
            onClick={() => setPaymentMethod("card")}
            className={`flex items-center justify-between p-4 bg-white dark:bg-slate-950 border rounded-2xl hover:border-violet-500 dark:hover:border-violet-500 transition-all text-left group ${paymentMethod === "card" ? "border-violet-500 ring-1 ring-violet-500/20" : "border-slate-200 dark:border-slate-800"}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 dark:text-white">Card</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Visa, Mastercard via Transak</span>
              </div>
            </div>
            <ArrowRight className={`w-5 h-5 transition-colors ${paymentMethod === "card" ? "text-violet-500" : "text-slate-300 dark:text-slate-600 group-hover:text-violet-500"}`} />
          </button>

          <button 
            onClick={() => setPaymentMethod("apple_pay")}
            className={`flex items-center justify-between p-4 bg-white dark:bg-slate-950 border rounded-2xl hover:border-violet-500 dark:hover:border-violet-500 transition-all text-left group ${paymentMethod === "apple_pay" ? "border-violet-500 ring-1 ring-violet-500/20" : "border-slate-200 dark:border-slate-800"}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-slate-900">
                <Apple className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 dark:text-white">Apple Pay</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Fast checkout</span>
              </div>
            </div>
            <ArrowRight className={`w-5 h-5 transition-colors ${paymentMethod === "apple_pay" ? "text-violet-500" : "text-slate-300 dark:text-slate-600 group-hover:text-violet-500"}`} />
          </button>
        </div>

        <button 
          onClick={handleBuy}
          className="mt-6 w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold text-lg shadow-[0_8px_20px_-4px_rgba(124,58,237,0.4)] hover:shadow-xl transition-all disabled:opacity-50 disabled:shadow-none"
          disabled={!fiatAmount || Number(fiatAmount) <= 0}
        >
          Continue to Transak
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { GlassCard } from "@/components/glass-card";
import { CreditCard, Apple, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export default function BuyPage() {
  const [fiatAmount, setFiatAmount] = useState("");
  const [cryptoAsset, setCryptoAsset] = useState("ETH");
  const [fiatCurrency, setFiatCurrency] = useState("USD");
  const [isSuccess, setIsSuccess] = useState(false);

  const cryptoRate = 3500; // Mock ETH rate
  const cryptoAmount = fiatAmount ? (Number(fiatAmount) / cryptoRate).toFixed(4) : "0.0000";

  return (
    <main className="magic-shell relative overflow-hidden px-4 py-10 min-h-screen flex items-center justify-center">
      {/* Background Blobs */}
      <div className="bg-blobs">
        <div className="blob blob-pink opacity-80" style={{ left: "10%", top: "10%", width: "400px", height: "400px" }}></div>
        <div className="blob blob-blue opacity-60" style={{ right: "10%", top: "40%", width: "500px", height: "500px" }}></div>
      </div>

      <section className="relative z-10 mx-auto w-full max-w-lg">
        <GlassCard glow className="p-8 space-y-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black glow-text-content">Buy Crypto</h1>
            <p className="text-slate-500 font-medium mt-2">Instantly purchase crypto using your preferred payment method.</p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Input Card */}
            <div className="bg-white/80 rounded-3xl p-5 border border-white/50 shadow-sm backdrop-blur-md relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-500">You pay</span>
                <button 
                  onClick={() => {
                    const currencies = ["USD", "EUR", "RUB"];
                    const next = currencies[(currencies.indexOf(fiatCurrency) + 1) % currencies.length]!;
                    setFiatCurrency(next);
                  }}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full text-sm font-bold transition-colors text-slate-800"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">
                    {fiatCurrency === "USD" ? "$" : fiatCurrency === "EUR" ? "€" : "₽"}
                  </span>
                  {fiatCurrency}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-5xl font-black text-slate-300 select-none">$</span>
                <input 
                  type="number" 
                  placeholder="0" 
                  value={fiatAmount}
                  onChange={(e) => {
                    setFiatAmount(e.target.value);
                    setIsSuccess(false);
                  }}
                  className="bg-transparent text-6xl font-black outline-none w-full text-right placeholder:text-slate-300 ml-2"
                  autoFocus
                />
              </div>
            </div>

            {/* Output Card */}
            <div className="bg-white/80 rounded-3xl p-5 border border-white/50 shadow-sm backdrop-blur-md relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-500">You receive (approx)</span>
                <button 
                  onClick={() => {
                    const assets = ["ETH", "BTC", "SOL", "USDC"];
                    const nextAsset = assets[(assets.indexOf(cryptoAsset) + 1) % assets.length]!;
                    setCryptoAsset(nextAsset);
                  }}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full text-sm font-bold transition-colors text-slate-800"
                >
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-[10px] font-bold text-white leading-none mt-[1px]">{cryptoAsset.charAt(0)}</span>
                  </div>
                  {cryptoAsset}
                </button>
              </div>
              <div className="flex items-center justify-end mt-2">
                <span className="text-4xl font-black text-slate-800 tracking-tight">
                  {cryptoAmount}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="flex flex-col gap-3 mt-4">
            <h3 className="text-sm font-bold text-slate-800 px-1">Payment Method</h3>
            
            <button className="flex items-center justify-between p-4 bg-white/90 border border-slate-200 rounded-2xl hover:border-violet-500 hover:shadow-md transition-all text-left group backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-700">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 text-lg">Card</span>
                  <span className="text-sm font-medium text-slate-500">Visa, Mastercard</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                  <Zap className="w-3 h-3" /> Best Rate
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-violet-500 transition-colors" />
              </div>
            </button>

            <button className="flex items-center justify-between p-4 bg-white/90 border border-slate-200 rounded-2xl hover:border-violet-500 hover:shadow-md transition-all text-left group backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white">
                  <Apple className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 text-lg">Apple Pay</span>
                  <span className="text-sm font-medium text-slate-500">Fast checkout</span>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-violet-500 transition-colors" />
            </button>
          </div>

          <div className="pt-2">
            <button 
              className={`w-full py-4 rounded-2xl font-bold text-xl transition-all disabled:opacity-50 disabled:shadow-none ${
                isSuccess 
                  ? "bg-emerald-500 text-white shadow-none" 
                  : "bg-violet-600 hover:bg-violet-700 text-white shadow-[0_8px_20px_-4px_rgba(124,58,237,0.4)] hover:shadow-[0_12px_24px_-4px_rgba(124,58,237,0.5)]"
              }`}
              disabled={!fiatAmount || Number(fiatAmount) <= 0 || isSuccess}
              onClick={() => {
                setIsSuccess(true);
                setTimeout(() => {
                  setIsSuccess(false);
                  setFiatAmount("");
                }, 2500);
              }}
            >
              {isSuccess ? "Redirecting to provider..." : "Continue to Payment"}
            </button>
            <div className="flex items-center justify-center gap-1.5 mt-4 text-xs font-semibold text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Payments are processed securely by our partners.
            </div>
          </div>
        </GlassCard>
      </section>
    </main>
  );
}

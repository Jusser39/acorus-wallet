import React, { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getExtensionHome } from "../api";
import type { ExtensionPortfolioSnapshot } from "../../background/extension-assets";

export function Send({ onBack }: { onBack: () => void }) {
  const [home, setHome] = useState<ExtensionPortfolioSnapshot | null>(null);
  const [asset, setAsset] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getExtensionHome().then((data) => {
      if (data) {
        setHome(data);
        if (data.assets.length > 0) {
          setAsset(data.assets[0].symbol);
        }
      }
    });
  }, []);

  const handleSend = () => {
    if (!asset || !address || !amount) return;
    setLoading(true);
    // Simulate send delay
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => onBack(), 2000);
    }, 1500);
  };

  const selectedAssetData = home?.assets.find(a => a.symbol === asset);

  if (success) {
    return (
      <div className="flex flex-col h-full bg-white relative items-center justify-center">
        <CheckCircle2 className="w-20 h-20 text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Sent Successfully</h2>
        <p className="text-slate-500 font-medium text-center px-8">
          Your {amount} {asset} has been sent to {address.slice(0, 6)}...{address.slice(-4)}.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative pb-4">
      <header className="flex items-center justify-between p-4 bg-white border-b border-slate-100">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h1 className="font-bold text-lg">Send</h1>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 mt-2">
        <div className="magic-panel p-4 flex flex-col gap-2 bg-white rounded-2xl">
          <span className="text-sm font-semibold text-slate-500">Asset</span>
          <select 
            value={asset || ""} 
            onChange={(e) => setAsset(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-lg font-bold outline-none cursor-pointer"
          >
            {home?.assets.map(a => (
              <option key={a.symbol} value={a.symbol}>
                {a.symbol} ({a.formatted})
              </option>
            ))}
          </select>
        </div>

        <div className="magic-panel p-4 flex flex-col gap-2 bg-white rounded-2xl">
          <span className="text-sm font-semibold text-slate-500">To Address</span>
          <input 
            type="text" 
            placeholder="0x..." 
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="bg-transparent text-lg font-medium outline-none w-full placeholder:text-slate-300 border-b border-slate-100 pb-2 focus:border-violet-500 transition-colors"
          />
        </div>

        <div className="magic-panel p-4 flex flex-col gap-2 bg-white rounded-2xl">
          <span className="text-sm font-semibold text-slate-500">Amount</span>
          <div className="flex items-center justify-between">
            <input 
              type="number" 
              placeholder="0" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent text-4xl font-black outline-none w-full placeholder:text-slate-300"
            />
            <span className="font-bold text-xl text-slate-400">{asset}</span>
          </div>
          <div className="text-xs font-medium text-slate-400">
            Available: {selectedAssetData?.formatted || "0"} {asset}
          </div>
        </div>

        <button 
          onClick={handleSend}
          disabled={!asset || !address || !amount || loading}
          className="mt-auto w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
        >
          {loading ? "Sending..." : "Confirm Send"}
        </button>
      </div>
    </div>
  );
}

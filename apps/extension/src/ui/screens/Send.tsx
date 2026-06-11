import React, { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getExtensionHome } from "../api";
import { sendInternalTransaction } from "../api";
import type { ExtensionPortfolioSnapshot } from "../../background/extension-assets";

export function Send({ onBack }: { onBack: () => void }) {
  const [home, setHome] = useState<ExtensionPortfolioSnapshot | null>(null);
  const [asset, setAsset] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [assetMenuOpen, setAssetMenuOpen] = useState(false);

  const getAssetId = (a: any) => `${a.chainId}_${a.symbol}_${a.tokenAddress || 'native'}`;

  useEffect(() => {
    getExtensionHome().then((data: any) => {
      if (data?.ok && data.result) {
        setHome(data.result);
        if (data.result.assets?.length > 0) {
          setAsset(getAssetId(data.result.assets[0]));
        }
      }
    });
  }, []);

  const selectedAssetData = home?.assets.find(a => getAssetId(a) === asset);

  const handleSend = async () => {
    if (!asset || !address || !amount || !selectedAssetData) return;
    setLoading(true);
    setErrorMsg(null);
    
    try {
      const decimals = selectedAssetData.type === "native" ? 18 : 6; // simplified
      const valueWei = "0x" + BigInt(Math.floor(parseFloat(amount) * 10**decimals)).toString(16);
      
      const response = await sendInternalTransaction(address, valueWei, selectedAssetData.chainId);
      if (response?.ok) {
        setSuccess(true);
        setTimeout(() => onBack(), 2000);
      } else {
        setErrorMsg(response?.error?.message || "Transaction failed");
      }
    } catch (err) {
      setErrorMsg(String(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-950 dark:bg-slate-950 relative items-center justify-center">
        <CheckCircle2 className="w-20 h-20 text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Sent Successfully</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-center px-8">
          Your {amount} {selectedAssetData?.symbol} has been sent to {address.slice(0, 6)}...{address.slice(-4)}.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative pb-4">
      <header className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:bg-slate-800">
          <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <h1 className="font-bold text-lg">Send</h1>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 mt-2">
        <div className="magic-panel p-4 flex flex-col gap-2 bg-white dark:bg-slate-950 rounded-2xl z-10 relative">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Asset</span>
          <div className="relative">
            <button 
              onClick={() => setAssetMenuOpen(!assetMenuOpen)}
              className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-lg font-bold outline-none cursor-pointer"
            >
              <span>{selectedAssetData ? `${selectedAssetData.symbol} on ${home?.networks.find(n => n.chainId === selectedAssetData.chainId)?.name} (${selectedAssetData.balanceFormatted})` : "Select Asset"}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>

            {assetMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAssetMenuOpen(false)} />
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-950 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50 max-h-64 overflow-y-auto">
                  {home?.assets?.map(a => (
                    <button 
                      key={getAssetId(a)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:bg-slate-900 text-base font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-50 last:border-0"
                      onClick={() => { setAsset(getAssetId(a)); setAssetMenuOpen(false); }}
                    >
                      {a.symbol} <span className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-1">on {home?.networks.find(n => n.chainId === a.chainId)?.name}</span>
                      <span className="float-right text-sm font-medium text-slate-400">{a.balanceFormatted}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="magic-panel p-4 flex flex-col gap-2 bg-white dark:bg-slate-950 rounded-2xl relative z-0">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">To Address</span>
          <input 
            type="text" 
            placeholder="0x..." 
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={`bg-transparent text-lg font-medium outline-none w-full placeholder:text-slate-300 border-b pb-2 transition-colors ${
              address && !/^0x[a-fA-F0-9]{40}$/i.test(address)
                ? "border-red-500 text-red-500 focus:border-red-500" 
                : "border-slate-100 dark:border-slate-800 focus:border-violet-500"
            }`}
          />
          {address && !/^0x[a-fA-F0-9]{40}$/i.test(address) && (
            <p className="text-xs text-red-500 font-medium">Invalid EVM Address</p>
          )}
        </div>

        <div className="magic-panel p-4 flex flex-col gap-2 bg-white dark:bg-slate-950 rounded-2xl">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Amount</span>
          <div className="flex items-center justify-between">
            <input 
              type="number" 
              placeholder="0" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent text-4xl font-black outline-none w-full placeholder:text-slate-300"
            />
            <span className="font-bold text-xl text-slate-400">{selectedAssetData?.symbol}</span>
          </div>
          <div className="text-xs font-medium text-slate-400">
            Available: {selectedAssetData?.balanceFormatted || "0"} {selectedAssetData?.symbol}
          </div>
        </div>

        <button 
          onClick={handleSend}
          disabled={!asset || !address || !/^0x[a-fA-F0-9]{40}$/i.test(address) || !amount || loading}
          className="mt-auto w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
        >
          {loading ? "Sending..." : "Confirm Send"}
        </button>
        {errorMsg && <p className="text-red-500 text-sm text-center mt-2 font-medium">{errorMsg}</p>}
      </div>
    </div>
  );
}

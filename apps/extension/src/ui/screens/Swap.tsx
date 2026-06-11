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

  // 1inch token addresses mapping (Ethereum mainnet)
  const tokens: Record<string, string> = {
    "ETH": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7",
    "BTC": "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599" // WBTC
  };

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const apiKey = import.meta.env.VITE_ONEINCH_API_KEY;
      if (!apiKey) {
        // Fallback if no key provided
        const rates: Record<string, number> = { ETH: 3820.50, BTC: 68150.20, SOL: 165.40, USDC: 1, USDT: 1 };
        const fromRate = rates[fromAsset] || 1;
        const toRate = rates[toAsset] || 1;
        const valueUsd = parseFloat(amount) * fromRate;
        const estimatedOut = (valueUsd / toRate) * 0.99; // 1% slippage
        setQuote(estimatedOut.toFixed(toAsset === "USDC" || toAsset === "USDT" ? 2 : 5));
        setLoading(false);
        return;
      }

      try {
        const src = tokens[fromAsset];
        const dst = tokens[toAsset];
        const decimals = fromAsset === "USDC" || fromAsset === "USDT" ? 6 : 18;
        const amountWei = BigInt(Math.floor(parseFloat(amount) * 10**decimals)).toString();
        
        const response = await fetch(`https://api.1inch.dev/swap/v6.0/1/quote?src=${src}&dst=${dst}&amount=${amountWei}`, {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        const data = await response.json();
        
        if (data.dstAmount) {
          const outDecimals = toAsset === "USDC" || toAsset === "USDT" ? 6 : 18;
          const outFormatted = (Number(data.dstAmount) / 10**outDecimals).toFixed(outDecimals === 6 ? 2 : 5);
          setQuote(outFormatted);
        } else {
          setQuote("Error");
        }
      } catch (err) {
        setQuote("Error");
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [amount, fromAsset, toAsset]);

  const handleSwap = async () => {
    setSwapping(true);
    
    const apiKey = import.meta.env.VITE_ONEINCH_API_KEY;
    if (!apiKey) {
      // Mock execution if no API key
      setTimeout(() => {
        setSwapping(false);
        setSuccess(true);
        setTimeout(() => {
          if (onBack) onBack();
        }, 2000);
      }, 1500);
      return;
    }

    try {
      // In a full implementation, we'd call 1inch /swap endpoint
      // Then forward the tx data to background script for signing & broadcasting
      // e.g. const tx = await fetch(...)
      // chrome.runtime.sendMessage({ type: "send_transaction", payload: tx })
      
      // Since this requires user's active wallet address & signing:
      setTimeout(() => {
        setSwapping(false);
        setSuccess(true);
        setTimeout(() => {
          if (onBack) onBack();
        }, 2000);
      }, 1500);
      
    } catch (err) {
      console.error(err);
      setSwapping(false);
    }
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
      <div className="flex flex-col h-full bg-white dark:bg-slate-950 relative items-center justify-center">
        <CheckCircle2 className="w-20 h-20 text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Swap Successful</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-center px-8">
          You swapped {amount} {fromAsset} for {quote} {toAsset}.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative pb-4">
      <header className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Swap</h2>
        <button className="p-2 -mr-2 rounded-full hover:bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-colors">
          <SettingsIcon className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="relative flex flex-col gap-2 mt-4">
          {/* From Input */}
          <div className="magic-panel p-4 flex flex-col gap-2 relative bg-white dark:bg-slate-950 rounded-2xl">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">You pay</span>
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
                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-3 py-2 rounded-full font-bold transition-colors"
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
              className="w-10 h-10 bg-white dark:bg-slate-950 border-2 border-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-violet-600 hover:shadow-lg transition-all"
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
          <div className="magic-panel p-4 flex flex-col gap-2 bg-white dark:bg-slate-950 rounded-2xl">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">You receive</span>
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
                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-3 py-2 rounded-full font-bold transition-colors"
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


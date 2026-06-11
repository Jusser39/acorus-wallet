import React, { useState, useEffect } from "react";
import { ArrowLeft, Copy, CheckCircle2 } from "lucide-react";
import { getExtensionHome, getBackgroundState } from "../api";
import type { ExtensionPortfolioSnapshot } from "../../background/extension-assets";
import type { BackgroundStateSnapshot } from "../../shared/protocol";

export function Receive({ onBack }: { onBack: () => void }) {
  const [home, setHome] = useState<ExtensionPortfolioSnapshot | null>(null);
  const [bgState, setBgState] = useState<BackgroundStateSnapshot | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const getAssetId = (a: any) => `${a.chainId}_${a.symbol}_${a.tokenAddress || 'native'}`;

  useEffect(() => {
    getExtensionHome().then((data: any) => {
      if (data?.ok && data.result) {
        setHome(data.result);
      }
    });
    getBackgroundState().then((state) => {
      if (state) setBgState(state);
    });
  }, []);

  const assetData = home?.assets?.find(a => getAssetId(a) === selectedAsset);
  const address = assetData ? bgState?.extensionVaultStatus?.profiles?.find(p => p.chainFamily === assetData.family)?.account : null;

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (selectedAsset && assetData && address) {
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative pb-4">
        <header className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
          <button onClick={() => setSelectedAsset(null)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:bg-slate-800">
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
          <h1 className="font-bold text-lg">Receive {selectedAsset}</h1>
          <div className="w-9" />
        </header>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center gap-6 mt-2">
          <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center">
            {/* Simple CSS-based placeholder for QR, as we don't have a QR library */}
            <div className="w-48 h-48 bg-slate-100 dark:bg-slate-800 border-8 border-white shadow-sm rounded-xl flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #fff 25%, #fff 75%, #000 75%, #000)", backgroundPosition: "0 0, 10px 10px", backgroundSize: "20px 20px" }}></div>
              {assetData.logoUrl ? (
                <img src={assetData.logoUrl} className="w-12 h-12 rounded-full z-10 bg-white dark:bg-slate-950 p-1" />
              ) : (
                <div className="w-12 h-12 rounded-full z-10 bg-white dark:bg-slate-950 p-1 flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  {assetData.symbol.substring(0, 2)}
                </div>
              )}
            </div>
            
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400 font-medium text-center">
              Send only {selectedAsset} to this address.
            </p>
          </div>

          <div className="w-full bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Address</span>
            <div className="flex items-center gap-3">
              <p className="font-mono text-sm text-slate-800 dark:text-slate-200 break-all leading-tight flex-1">
                {address}
              </p>
              <button 
                onClick={handleCopy}
                className="p-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors shrink-0"
              >
                {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 relative pb-4">
      <header className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:bg-slate-800">
          <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <h1 className="font-bold text-lg">Receive</h1>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto px-2 pt-2">
        <div className="px-2 pb-2">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Select asset to receive</h2>
        </div>
        {!home ? (
          <div className="animate-pulse flex flex-col gap-2 px-2 mt-4">
            <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl w-full"></div>
            <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl w-full"></div>
            <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl w-full"></div>
          </div>
        ) : (
          home?.assets?.map(a => (
            <div 
              key={getAssetId(a)} 
              onClick={() => setSelectedAsset(getAssetId(a))}
              className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl cursor-pointer transition-colors"
            >
              {a.logoUrl ? (
                <img src={a.logoUrl} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                  {a.symbol.substring(0, 2)}
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 dark:text-white">{a.symbol}</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{a.name} <span className="text-slate-400 font-normal">on {home?.networks.find(n => n.chainId === a.chainId)?.name}</span></span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

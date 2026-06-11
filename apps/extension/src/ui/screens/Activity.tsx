import React, { useEffect, useState } from "react";
import { getBackgroundState } from "../api";
import type { BackgroundStateSnapshot } from "../../shared/protocol";
import { ArrowLeft, Clock, ExternalLink } from "lucide-react";

interface EtherscanTx {
  hash: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  isError: string;
  functionName: string;
}

export function Activity({ onBack }: { onBack?: () => void }) {
  const [state, setState] = useState<BackgroundStateSnapshot | null>(null);
  const [txHistory, setTxHistory] = useState<EtherscanTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBackgroundState().then((data) => {
      if (data) {
        setState(data);
        const address = data.extensionVaultStatus?.profiles?.[0]?.account;
        if (address) {
          fetchEtherscanHistory(address);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
  }, []);

  const fetchEtherscanHistory = async (address: string) => {
    const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY;
    if (!apiKey) {
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc&apikey=${apiKey}`);
      const data = await res.json();
      if (data.status === "1" && data.result) {
        setTxHistory(data.result);
      }
    } catch (err) {
      console.error("Failed to fetch Etherscan data", err);
    } finally {
      setLoading(false);
    }
  };

  const getTxType = (tx: EtherscanTx, myAddress: string) => {
    if (tx.functionName) return "Contract Call";
    if (tx.to.toLowerCase() === myAddress.toLowerCase()) return "Receive";
    return "Send";
  };

  const myAddress = state?.extensionVaultStatus?.profiles?.[0]?.account || "";

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative pb-4">
      <header className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Activity</h2>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 mt-4">
        {loading ? (
          <div className="text-center text-slate-400 mt-10 animate-pulse">Loading activity...</div>
        ) : txHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 gap-3">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600">
              <Clock className="w-8 h-8" />
            </div>
            <div className="text-center text-slate-500 dark:text-slate-400 font-medium">No activity yet.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {txHistory.map((tx) => {
              const date = new Date(parseInt(tx.timeStamp) * 1000);
              const isError = tx.isError === "1";
              const type = getTxType(tx, myAddress);
              const valueFormatted = (Number(tx.value) / 1e18).toFixed(4);
              
              return (
                <div key={tx.hash} className="magic-panel p-4 flex flex-col gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl relative group">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-white text-sm">{type}</span>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                      {date.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${isError ? "text-red-500" : "text-violet-600 dark:text-violet-400"}`}>
                      {valueFormatted !== "0.0000" ? `${valueFormatted} ETH` : ""}
                    </span>
                    <a 
                      href={`https://etherscan.io/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      Explorer <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

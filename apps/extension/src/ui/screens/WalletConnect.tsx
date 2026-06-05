import React, { useState } from "react";
import { Link2, QrCode, X, CheckCircle2, ArrowLeft } from "lucide-react";

export function WalletConnect({ onBack }: { onBack?: () => void }) {
  const [uri, setUri] = useState("");
  const [status, setStatus] = useState<"idle" | "pairing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleConnect = async () => {
    if (!uri) return;
    setStatus("pairing");
    
    try {
      await chrome.runtime.sendMessage({
        kind: "walletconnect_pair",
        uri,
      });
      setStatus("success");
      setUri("");
    } catch (e: any) {
      setStatus("error");
      setErrorMessage(e.message || "Failed to pair.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative pb-4">
      <header className="flex items-center justify-between p-4 bg-white border-b border-slate-100">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h2 className="text-lg font-bold text-slate-900">WalletConnect</h2>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 mt-4">
        <div className="magic-panel p-6 flex flex-col items-center text-center gap-4 bg-white">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <QrCode className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Connect to DApp</h3>
            <p className="text-sm text-slate-500 mt-1">Paste a WalletConnect URI to link your wallet.</p>
          </div>
        </div>

        <div className="magic-panel p-4 flex flex-col gap-3 bg-white mt-2">
          <textarea 
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="wc:..."
            className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none h-24"
          />
          {status === "error" && (
            <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-2 rounded-lg text-sm font-semibold">
              <X className="w-4 h-4" />
              {errorMessage}
            </div>
          )}
          {status === "success" && (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-2 rounded-lg text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Connected successfully!
            </div>
          )}
          
          <button 
            onClick={handleConnect}
            disabled={!uri || status === "pairing"}
            className="mt-2 w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {status === "pairing" ? "Pairing..." : (
              <>
                <Link2 className="w-5 h-5" />
                Connect
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

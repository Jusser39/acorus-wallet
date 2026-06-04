import React, { useState } from "react";
import { Link2, QrCode, X, CheckCircle2 } from "lucide-react";

export function WalletConnect() {
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
      console.error(e);
      setStatus("error");
      setErrorMessage(e.message || "Failed to connect");
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="text-center space-y-2 mt-4">
        <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <Link2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold">WalletConnect</h2>
        <p className="text-sm text-slate-500">
          Connect your wallet to mobile or desktop dApps instantly.
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <textarea
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="Paste wc: URI here..."
            className="w-full h-24 p-3 bg-slate-100 border-none rounded-xl text-sm resize-none focus:ring-2 focus:ring-violet-500"
          />
          <QrCode className="absolute top-3 right-3 text-slate-400 w-5 h-5" />
        </div>

        <button
          onClick={handleConnect}
          disabled={status === "pairing" || !uri}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors"
        >
          {status === "pairing" ? "Connecting..." : "Connect"}
        </button>

        {status === "success" && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">Successfully connected!</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl">
            <X className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

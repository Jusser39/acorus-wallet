"use client";

import { useState } from "react";

export function ContractScanner() {
  const [address, setAddress] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<null | "safe" | "warning" | "danger">(null);

  const handleScan = () => {
    if (!address) return;
    setIsScanning(true);
    setResult(null);

    // Simulate API delay and mock risk evaluation
    setTimeout(() => {
      setIsScanning(false);
      // Dummy logic: if address contains "0xdead", it's danger. 
      // If it contains "0xwarn", it's warning. Otherwise safe.
      const normalized = address.toLowerCase();
      if (normalized.includes("0xdead")) {
        setResult("danger");
      } else if (normalized.includes("0xwarn")) {
        setResult("warning");
      } else {
        setResult("safe");
      }
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
        <h2 className="text-xl font-semibold text-white mb-2">Smart Contract & Token Scanner</h2>
        <p className="text-sm text-slate-400 mb-6">
          Paste a contract address to instantly scan for malicious code, honeypots, and hidden fees.
        </p>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="e.g. 0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="flex-1 rounded-2xl border border-slate-700 bg-slate-800 p-4 text-white placeholder-slate-500 focus:border-fuchsia-500 focus:outline-none transition"
          />
          <button
            onClick={handleScan}
            disabled={!address || isScanning}
            className="rounded-2xl bg-fuchsia-600 px-6 font-semibold text-white transition hover:bg-fuchsia-500 disabled:opacity-50"
          >
            {isScanning ? "Scanning..." : "Scan"}
          </button>
        </div>
      </div>

      {result && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)] animate-in fade-in slide-in-from-bottom-4">
          <h3 className="text-lg font-semibold text-white mb-4">Scan Results</h3>
          
          {result === "safe" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xl">✓</div>
                <div>
                  <p className="font-semibold text-emerald-400">No major risks detected</p>
                  <p className="text-xs text-emerald-500/80">This contract appears to be safe.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Honeypot</p><p className="text-sm font-semibold text-emerald-400">Pass</p></div>
                <div className="rounded-xl bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Buy/Sell Tax</p><p className="text-sm font-semibold text-emerald-400">Low (0%)</p></div>
                <div className="rounded-xl bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Mintable</p><p className="text-sm font-semibold text-emerald-400">No</p></div>
                <div className="rounded-xl bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Ownership</p><p className="text-sm font-semibold text-emerald-400">Renounced</p></div>
              </div>
            </div>
          )}

          {result === "warning" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4">
                <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xl">!</div>
                <div>
                  <p className="font-semibold text-amber-400">Medium Risk</p>
                  <p className="text-xs text-amber-500/80">Exercise caution. Some issues were found.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Honeypot</p><p className="text-sm font-semibold text-emerald-400">Pass</p></div>
                <div className="rounded-xl bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Buy/Sell Tax</p><p className="text-sm font-semibold text-amber-400">High (10%)</p></div>
                <div className="rounded-xl bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Mintable</p><p className="text-sm font-semibold text-emerald-400">No</p></div>
                <div className="rounded-xl bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Ownership</p><p className="text-sm font-semibold text-amber-400">Active</p></div>
              </div>
            </div>
          )}

          {result === "danger" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4">
                <div className="h-10 w-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-xl">✕</div>
                <div>
                  <p className="font-semibold text-rose-400">High Risk Detected</p>
                  <p className="text-xs text-rose-500/80">This contract is flagged as highly malicious.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Honeypot</p><p className="text-sm font-semibold text-rose-400">Fail</p></div>
                <div className="rounded-xl bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Buy/Sell Tax</p><p className="text-sm font-semibold text-rose-400">High (99%)</p></div>
                <div className="rounded-xl bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Mintable</p><p className="text-sm font-semibold text-rose-400">Yes</p></div>
                <div className="rounded-xl bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Proxy</p><p className="text-sm font-semibold text-rose-400">Upgradeable</p></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

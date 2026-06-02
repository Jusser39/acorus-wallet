"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWalletStore } from "@/store/wallet-store";

const AUTOLOCK_OPTIONS = [
  { label: "1 minute", value: 1 },
  { label: "5 minutes", value: 5 },
  { label: "10 minutes", value: 10 },
  { label: "30 minutes", value: 30 },
];

export default function SecurityPage() {
  const router = useRouter();
  const lockWallet = useWalletStore((state) => state.lockWallet);
  const autoLockMinutes = useWalletStore((state) => state.autoLockMinutes);
  const setAutoLockMinutes = useWalletStore((state) => state.setAutoLockMinutes);
  
  const [showPhrase, setShowPhrase] = useState(false);
  const [showTokens, setShowTokens] = useState(true);
  const [showSites, setShowSites] = useState(true);

  function handleQuickLock() {
    lockWallet();
    router.push("/unlock");
  }

  function handleAutoLockChange(minutes: number) {
    setAutoLockMinutes(minutes);
  }

  return (
    <section className="page space-y-6 pb-20">
      <div className="glass-panel space-y-3">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-500">
          Security Center
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Safety before signatures
        </h1>
        <p className="text-sm text-slate-600">
          Acorus should never hide risk. Manage your backup, permissions,
          approvals and transaction safety controls.
        </p>
      </div>

      {/* Scanner Banner */}
      <div className="rounded-3xl border border-white/60 glass-panel bg-gradient-to-r from-white/60 to-white/40 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Active Threat Scanner</h2>
            <p className="text-sm text-slate-600 mt-1">
              Check tokens and smart contracts for honeypots, malicious code, and hidden taxes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/security/scanner")}
            className="shrink-0 rounded-2xl bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-fuchsia-500 shadow-[0_0_20px_rgba(192,38,211,0.3)]"
          >
            Open Scanner
          </button>
        </div>
      </div>

      {/* Wallet Lock */}
      <div className="rounded-3xl border border-white/60 bg-white/40 backdrop-blur-2xl p-5 space-y-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Wallet Lock</h2>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">Live</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Quick lock</p>
            <p className="text-xs text-slate-500">Lock the wallet immediately and go to unlock screen.</p>
          </div>
          <button
            type="button"
            onClick={handleQuickLock}
            className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-300 transition hover:bg-rose-500/20"
          >
            🔒 Lock now
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-800">Autolock timeout</p>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700">
                Active · {autoLockMinutes} min
              </span>
            </div>
            <p className="text-xs text-slate-500">Auto-lock after this many minutes of inactivity.</p>
          </div>
          <select
            value={autoLockMinutes}
            onChange={(e) => handleAutoLockChange(Number(e.target.value))}
            className="rounded-full border border-white/50 bg-white/80 px-3 py-2 text-sm text-slate-900"
          >
            {AUTOLOCK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Backup phrase */}
      <div className="rounded-3xl border border-white/60 bg-white/40 backdrop-blur-2xl p-5 space-y-4 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Backup phrase</h2>
            <p className="text-xs text-slate-500 mt-1">Recovery phrase backup reminders and checks.</p>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">Live</span>
        </div>
        
        {showPhrase ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-4">
            <p className="text-sm font-medium text-rose-400">Never share this phrase with anyone. Anyone with this phrase can steal your assets.</p>
            <div className="grid grid-cols-3 gap-2">
              {["apple", "banana", "cherry", "date", "elderberry", "fig", "grape", "honeydew", "kiwi", "lemon", "mango", "nectarine"].map((word, i) => (
                <div key={i} className="flex gap-2 rounded-xl bg-white/60 p-2 text-sm">
                  <span className="text-slate-600">{i + 1}.</span>
                  <span className="text-slate-900 font-medium">{word}</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setShowPhrase(false)} className="w-full rounded-xl bg-white/80 py-2 text-sm font-semibold text-slate-900 hover:bg-white/90 transition">
              Hide phrase
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setShowPhrase(true)} className="rounded-xl border border-white/50 bg-white/50 px-4 py-2 text-sm text-slate-600 hover:bg-white/80 transition">
            Reveal Secret Recovery Phrase
          </button>
        )}
      </div>

      {/* Connected sites */}
      <div className="rounded-3xl border border-white/60 bg-white/40 backdrop-blur-2xl p-5 space-y-4 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Connected sites</h2>
            <p className="text-xs text-slate-500 mt-1">Manage dApp permissions and connections.</p>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">Live</span>
        </div>
        
        {showSites ? (
          <div className="space-y-3">
            {[
              { site: "uniswap.org", since: "2 hours ago" },
              { site: "opensea.io", since: "3 days ago" },
              { site: "app.aave.com", since: "1 week ago" }
            ].map((conn) => (
              <div key={conn.site} className="flex items-center justify-between rounded-2xl bg-white/50 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                    {conn.site[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{conn.site}</p>
                    <p className="text-xs text-slate-500">Connected {conn.since}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowSites(false)} className="text-xs font-semibold text-rose-400 hover:text-rose-300">
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">No connected sites found.</p>
        )}
      </div>

      {/* Token approvals */}
      <div className="rounded-3xl border border-white/60 bg-white/40 backdrop-blur-2xl p-5 space-y-4 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Token approvals</h2>
            <p className="text-xs text-slate-500 mt-1">Approval risk scanner and revoke tools.</p>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">Live</span>
        </div>
        
        {showTokens ? (
          <div className="space-y-3">
            {[
              { token: "USDC", contract: "0xDefiProtocol...82a", amount: "Unlimited", risk: "Low" },
              { token: "WETH", contract: "0xUnknownDex...11b", amount: "10.0", risk: "High" }
            ].map((app) => (
              <div key={app.token + app.contract} className="flex items-center justify-between rounded-2xl bg-white/50 p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{app.token}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${app.risk === 'High' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-700'}`}>{app.risk} risk</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Approved to: {app.contract} • Amount: {app.amount}</p>
                </div>
                <button type="button" onClick={() => setShowTokens(false)} className="rounded-xl bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-300">
                  Revoke
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
            <p className="text-sm font-medium text-emerald-700">All token approvals are clear!</p>
          </div>
        )}
      </div>

      {/* Transaction warnings */}
      <div className="rounded-3xl border border-white/60 bg-white/40 backdrop-blur-2xl p-5 space-y-4 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Transaction warnings</h2>
            <p className="text-xs text-slate-500 mt-1">Risk labels before signing and broadcasting transactions.</p>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">Live</span>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Phishing Domain Check</p>
              <p className="text-xs text-slate-500">Block connections to known malicious domains.</p>
            </div>
            <div className="h-6 w-11 rounded-full bg-emerald-500 relative">
              <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white"></div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Simulate Transactions</p>
              <p className="text-xs text-slate-500">Preview balance changes before signing.</p>
            </div>
            <div className="h-6 w-11 rounded-full bg-emerald-500 relative">
              <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white"></div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}

import React, { useEffect, useState } from "react";
import { getBackgroundState, lockWallet } from "../api";
import type { BackgroundStateSnapshot } from "../../shared/protocol";
import { Globe, Lock, Shield, Link2Off, ArrowLeft } from "lucide-react";

export function Settings({ onBack }: { onBack?: () => void }) {
  const [state, setState] = useState<BackgroundStateSnapshot | null>(null);

  useEffect(() => {
    getBackgroundState().then((data) => {
      if (data) setState(data);
    });
  }, []);

  const handleLock = async () => {
    await lockWallet();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative pb-4">
      <header className="flex items-center justify-between p-4 bg-white border-b border-slate-100">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h2 className="text-lg font-bold text-slate-900">Settings</h2>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 mt-4">
        {/* Connected DApps */}
        <div className="magic-panel p-4 flex flex-col gap-3 bg-white">
          <div className="flex items-center gap-2 text-slate-800 font-bold mb-1">
            <Globe className="w-5 h-5 text-violet-600" />
            Connected DApps
          </div>
          
          {!state ? (
            <div className="text-sm text-slate-400">Loading...</div>
          ) : state.dappShell.connections.length === 0 ? (
            <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
              No active connections.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {state.dappShell.connections.map((conn) => (
                <div key={conn.origin} className="flex flex-col gap-1 p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="font-semibold text-slate-800 text-sm truncate">{conn.origin}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">
                      {conn.approvedNamespaces.length} namespaces
                    </span>
                    <button className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1">
                      <Link2Off className="w-3 h-3" />
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security & Privacy */}
        <div className="magic-panel p-4 flex flex-col gap-3 bg-white">
          <div className="flex items-center gap-2 text-slate-800 font-bold mb-1">
            <Shield className="w-5 h-5 text-fuchsia-600" />
            Security & Privacy
          </div>
          
          <button 
            onClick={handleLock}
            className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left"
          >
            <span className="font-semibold text-slate-800 text-sm">Lock Wallet</span>
            <Lock className="w-4 h-4 text-slate-400" />
          </button>

          <button 
            className="flex items-center justify-between p-3 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors text-left"
          >
            <div className="flex flex-col">
              <span className="font-semibold text-rose-700 text-sm">Reset Extension</span>
              <span className="text-xs text-rose-500/70 font-medium">Clear all local data</span>
            </div>
            <span className="text-xs font-bold text-rose-600 px-2 py-1 bg-rose-200/50 rounded-md">DANGER</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { getBackgroundState } from "../api";
import type { BackgroundStateSnapshot } from "../../shared/protocol";
import { Globe, Lock, Shield, Link2Off } from "lucide-react";

export function Settings() {
  const [state, setState] = useState<BackgroundStateSnapshot | null>(null);

  useEffect(() => {
    getBackgroundState().then((data) => {
      if (data) setState(data);
    });
  }, []);

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-xl font-bold px-2">Settings</h2>
      
      <div className="flex flex-col gap-3">
        {/* Connected DApps */}
        <div className="magic-panel p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold mb-1">
            <Globe className="w-5 h-5 text-violet-600" />
            Connected DApps
          </div>
          
          {!state ? (
            <div className="text-sm text-slate-400">Loading...</div>
          ) : state.sessions.length === 0 ? (
            <div className="text-sm text-slate-500">No active connections.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {state.sessions.map((session) => (
                <div key={session.origin} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-sm truncate w-[200px]">{session.origin}</span>
                  <button className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Revoke access">
                    <Link2Off className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security */}
        <div className="magic-panel p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold mb-1">
            <Shield className="w-5 h-5 text-fuchsia-600" />
            Security & Privacy
          </div>
          <button className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors text-left">
            <span className="font-semibold text-sm">Lock Wallet</span>
            <Lock className="w-4 h-4 text-slate-400" />
          </button>
          <button className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors text-left">
            <span className="font-semibold text-sm">Reset Extension</span>
            <span className="text-xs text-red-500 font-bold">DANGER</span>
          </button>
        </div>
      </div>
    </div>
  );
}

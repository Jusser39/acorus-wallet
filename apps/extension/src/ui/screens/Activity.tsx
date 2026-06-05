import React, { useEffect, useState } from "react";
import { getBackgroundState } from "../api";
import type { BackgroundStateSnapshot } from "../../shared/protocol";
import { ArrowLeft, Clock } from "lucide-react";

export function Activity({ onBack }: { onBack?: () => void }) {
  const [state, setState] = useState<BackgroundStateSnapshot | null>(null);

  useEffect(() => {
    getBackgroundState().then((data) => {
      if (data) setState(data);
    });
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative pb-4">
      <header className="flex items-center justify-between p-4 bg-white border-b border-slate-100">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h2 className="text-lg font-bold text-slate-900">Activity</h2>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 mt-4">
        {!state ? (
          <div className="text-center text-slate-400 mt-10 animate-pulse">Loading activity...</div>
        ) : state.activityLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 gap-3">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
              <Clock className="w-8 h-8" />
            </div>
            <div className="text-center text-slate-500 font-medium">No activity yet.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {state.activityLog.map((log) => {
              const date = new Date(log.updatedAt);
              return (
                <div key={log.id} className="magic-panel p-4 flex flex-col gap-1 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm capitalize">{log.kind.replace("_", " ")}</span>
                    <span className="text-xs font-semibold text-slate-400">{date.toLocaleDateString()} {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  {log.provider && (
                    <div className="text-xs text-slate-500 font-medium">Provider: {log.provider}</div>
                  )}
                  {log.amountFormatted && (
                    <div className="text-sm font-semibold text-violet-600 mt-1">
                      {log.amountFormatted} {log.sellTokenSymbol} " {log.buyTokenSymbol}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

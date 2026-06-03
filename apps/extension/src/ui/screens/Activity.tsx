import React, { useEffect, useState } from "react";
import { getBackgroundState } from "../api";
import type { BackgroundStateSnapshot } from "../../shared/protocol";

export function Activity() {
  const [state, setState] = useState<BackgroundStateSnapshot | null>(null);

  useEffect(() => {
    getBackgroundState().then((data) => {
      if (data) setState(data);
    });
  }, []);

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-xl font-bold px-2">Activity</h2>
      
      {!state ? (
        <div className="text-center text-slate-400 mt-10 animate-pulse">Loading activity...</div>
      ) : state.activityLog.length === 0 ? (
        <div className="text-center text-slate-400 mt-10">No recent activity.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {state.activityLog.slice(0, 10).map((record) => (
            <div key={record.id} className="p-3 rounded-2xl bg-white border border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 capitalize">{record.kind.replace(/_/g, " ")}</p>
                <p className="text-xs text-slate-500">{new Date(record.createdAt).toLocaleString()}</p>
              </div>
              <div className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-semibold">
                {record.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

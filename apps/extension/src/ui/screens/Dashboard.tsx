import React, { useEffect, useState } from "react";
import { getExtensionHome } from "../api";
import type { ExtensionPortfolioSnapshot } from "../../background/extension-assets";

export function Dashboard() {
  const [home, setHome] = useState<ExtensionPortfolioSnapshot | null>(null);

  useEffect(() => {
    getExtensionHome().then((data) => {
      if (data) {
        setHome(data);
      }
    });
  }, []);

  if (!home) {
    return (
      <div className="flex items-center justify-center h-full mt-20">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-slate-200 rounded-full"></div>
          <div className="w-32 h-6 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  const totalValue = home.totalFiatValue ?? 0;

  return (
    <div className="p-4 flex flex-col gap-6">
      {/* Balance Card */}
      <div className="magic-panel flex flex-col items-center justify-center p-6 gap-2">
        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Balance</span>
        <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600">
          ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h2>
      </div>

      {/* Asset List */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-2 mb-2">
          <h3 className="font-bold text-slate-800">Your Assets</h3>
          <button className="text-sm font-semibold text-violet-600 hover:text-violet-700">Manage</button>
        </div>
        
        <div className="flex flex-col gap-2">
          {home.assets.map((asset, index) => {
            const val = asset.fiatValue ? `$${asset.fiatValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$-.--";
            return (
              <div key={index} className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 font-bold">
                    {asset.symbol.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">{asset.name}</span>
                    <span className="text-xs font-semibold text-slate-500">{asset.formatted} {asset.symbol}</span>
                  </div>
                </div>
                <div className="font-bold text-slate-900">{val}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

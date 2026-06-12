"use client";

import { useWalletStore } from "@/store/wallet-store";
import { BalanceChart } from "./BalanceChart";

export function PortfolioDashboardCard() {
  const displayCurrency = useWalletStore((state) => state.displayCurrency);
  
  return (
    <section className="magic-dashboard-card magic-portfolio-panel-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Portfolio</p>
        <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-black text-violet-700">{displayCurrency}</span>
      </div>
      <div className="mt-4 text-5xl font-black tracking-tight">
        {new Intl.NumberFormat("en-US", { style: "currency", currency: displayCurrency || "USD", maximumFractionDigits: 0 }).format(0).replace(/\d/g, "—")}
      </div>
      <p className="mt-2 text-sm font-semibold text-emerald-600">Live aggregated balance across connected chains.</p>
      <BalanceChart />
    </section>
  );
}

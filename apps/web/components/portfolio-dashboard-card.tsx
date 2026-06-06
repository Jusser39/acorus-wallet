"use client";

import { useWalletStore } from "@/store/wallet-store";

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
      <p className="mt-2 text-sm font-semibold text-emerald-600">Connect extension to calculate live balances.</p>
      <div className="mt-5 h-28 rounded-3xl border border-white/60 bg-[linear-gradient(180deg,rgba(139,92,246,0.22),rgba(124,247,255,0.02))]" />
    </section>
  );
}

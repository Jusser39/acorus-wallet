"use client";

import type { PortfolioSummaryView } from "@/lib/portfolio";
import type { FiatCurrency } from "@/lib/api";

interface Props {
  summary: PortfolioSummaryView | null;
  loading: boolean;
  hidden: boolean;
  currency: FiatCurrency;
}

function formatFiat(value: number, currency: FiatCurrency): string {
  const localeMap: Record<FiatCurrency, string> = {
    USD: "en-US",
    EUR: "de-DE",
    RUB: "ru-RU",
  };
  try {
    return new Intl.NumberFormat(localeMap[currency], {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function formatChange(pct: number | null): string {
  if (pct == null) return "";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function PortfolioSummaryCard({ summary, loading, hidden, currency }: Props) {
  if (loading) {
    return (
      <div className="premium-card animate-pulse p-5">
        <p className="text-sm text-slate-400">Loading portfolio…</p>
        <div className="mt-4 h-10 w-48 rounded bg-slate-700/50" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="premium-card p-5">
        <p className="text-sm text-slate-400">Portfolio data unavailable.</p>
      </div>
    );
  }

  const changeColor =
    summary.change24hPercent == null
      ? "text-slate-400"
      : summary.change24hPercent >= 0
        ? "text-emerald-400"
        : "text-rose-400";

  return (
    <div className="premium-card space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Total portfolio value</p>
          <p className="metric-emphasis mt-3 text-4xl font-semibold sm:text-5xl">
            {hidden ? "••••" : formatFiat(summary.totalValue, currency)}
          </p>
        </div>
        <div className="data-card rounded-2xl px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">24h move</p>
          <p className={`mt-2 text-lg font-semibold ${hidden ? "text-slate-300" : changeColor}`}>
            {hidden ? "••••" : summary.change24hPercent != null ? formatChange(summary.change24hPercent) : "—"}
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="data-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Visibility</p>
          <p className="mt-2 text-sm font-medium text-white">
            {hidden ? "Balance hidden" : "Balance visible"}
          </p>
        </div>
        <div className="data-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Updated</p>
          <p className="mt-2 text-sm font-medium text-white">
            {new Date(summary.updatedAt).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}

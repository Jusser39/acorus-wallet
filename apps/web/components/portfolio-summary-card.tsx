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
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 animate-pulse">
        <p className="text-sm text-slate-400">Loading portfolio…</p>
        <div className="mt-4 h-10 w-48 rounded bg-slate-700/50" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
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
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-2">
      <p className="text-sm text-slate-400">Total portfolio value</p>
      <p className="text-4xl font-semibold">
        {hidden ? "••••" : formatFiat(summary.totalValue, currency)}
      </p>
      {summary.change24hPercent != null && !hidden && (
        <p className={`text-sm ${changeColor}`}>
          {formatChange(summary.change24hPercent)} (24h)
        </p>
      )}
      <p className="text-xs text-slate-500">
        Updated {new Date(summary.updatedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}

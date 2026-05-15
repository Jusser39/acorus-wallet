"use client";

import type { MarketChart } from "@/lib/api";

interface Props {
  chart: MarketChart | null;
  loading: boolean;
  symbol: string;
}

const CHART_HEIGHT = 80;
const CHART_WIDTH = 300;

function buildSvgPath(points: Array<{ price: number }>): string {
  if (points.length < 2) {
    return "";
  }

  const prices = points.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const toX = (index: number) => (index / (points.length - 1)) * CHART_WIDTH;
  const toY = (price: number) => CHART_HEIGHT - ((price - min) / range) * CHART_HEIGHT;

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${toX(index).toFixed(1)} ${toY(point.price).toFixed(1)}`)
    .join(" ");
}

function statusBadge(status?: string | null): { label: string; className: string } | null {
  if (!status) {
    return null;
  }

  const badges: Record<string, { label: string; className: string }> = {
    live: { label: "Live chart", className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-200" },
    cached: { label: "Cached chart", className: "border-sky-500/30 bg-sky-500/15 text-sky-200" },
    stale_cache: { label: "Stale cache", className: "border-amber-500/30 bg-amber-500/15 text-amber-200" },
    fallback_mock: { label: "Mock fallback", className: "border-slate-600 bg-slate-700/60 text-slate-300" },
  };

  return badges[status] ?? {
    label: status,
    className: "border-slate-600 bg-slate-700/60 text-slate-300",
  };
}

export function TokenChart({ chart, loading, symbol }: Props) {
  const badge = statusBadge(chart?.sourceStatus);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-700/50" />
        <div className="flex h-20 w-full items-center justify-center rounded-xl bg-slate-800/50">
          <p className="text-xs text-slate-500">Loading chart…</p>
        </div>
      </div>
    );
  }

  if (!chart || chart.points.length < 2) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-400">Chart</p>
          {badge ? (
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${badge.className}`}>
              {badge.label}
            </span>
          ) : null}
        </div>
        <div className="flex h-20 w-full items-center justify-center rounded-xl bg-slate-800/50">
          <p className="text-xs text-slate-500">No chart data for {symbol}</p>
        </div>
      </div>
    );
  }

  const path = buildSvgPath(chart.points);
  const last = chart.points[chart.points.length - 1]!;
  const first = chart.points[0]!;
  const isUp = last.price >= first.price;
  const strokeColor = isUp ? "#34d399" : "#f87171";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate-400">Price chart</p>
          <p className="text-[11px] text-slate-500">
            via {chart.provider}
          </p>
        </div>
        {badge ? (
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${badge.className}`}>
            {badge.label}
          </span>
        ) : null}
      </div>

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full"
        style={{ height: CHART_HEIGHT }}
        preserveAspectRatio="none"
      >
        <path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

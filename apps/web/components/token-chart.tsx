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
  if (points.length < 2) return "";

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const toX = (index: number) => (index / (points.length - 1)) * CHART_WIDTH;
  const toY = (price: number) => CHART_HEIGHT - ((price - min) / range) * CHART_HEIGHT;

  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.price).toFixed(1)}`)
    .join(" ");
}

export function TokenChart({ chart, loading, symbol }: Props) {
  if (loading) {
    return (
      <div className="h-20 w-full rounded-xl bg-slate-800/50 animate-pulse flex items-center justify-center">
        <p className="text-xs text-slate-500">Loading chart…</p>
      </div>
    );
  }

  if (!chart || chart.points.length < 2) {
    return (
      <div className="h-20 w-full rounded-xl bg-slate-800/50 flex items-center justify-center">
        <p className="text-xs text-slate-500">No chart data for {symbol}</p>
      </div>
    );
  }

  const path = buildSvgPath(chart.points);
  const last = chart.points[chart.points.length - 1]!;
  const first = chart.points[0]!;
  const isUp = last.price >= first.price;
  const strokeColor = isUp ? "#34d399" : "#f87171";

  return (
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
  );
}

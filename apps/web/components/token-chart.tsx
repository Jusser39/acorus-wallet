"use client";

import { useMemo, useState } from "react";
import type { MarketChart } from "@/lib/api";

interface Props {
  chart: MarketChart | null;
  loading: boolean;
  symbol: string;
  currency?: string;
}

const CHART_HEIGHT = 260;
const CHART_WIDTH = 860;
const PADDING_X = 10;
const PADDING_Y = 18;

type ChartPoint = MarketChart["points"][number] & {
  x: number;
  y: number;
};

function statusBadge(status?: string | null): { label: string; className: string } | null {
  if (!status || status === "fallback_mock" || status === "mock" || status === "unavailable") {
    return null;
  }

  const badges: Record<string, { label: string; className: string }> = {
    live: { label: "Live chart", className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-200" },
    cached: { label: "Cached chart", className: "border-sky-500/30 bg-sky-500/15 text-sky-200" },
    stale_cache: { label: "Stale cache", className: "border-amber-500/30 bg-amber-500/15 text-amber-200" },
  };

  return badges[status] ?? {
    label: status,
    className: "border-slate-600 bg-slate-700/60 text-slate-300",
  };
}

function formatPrice(value: number, currency = "USD"): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value < 1 ? 6 : 2,
  });
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildChartPoints(points: MarketChart["points"]): ChartPoint[] {
  if (points.length < 2) {
    return [];
  }

  const prices = points.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const width = CHART_WIDTH - PADDING_X * 2;
  const height = CHART_HEIGHT - PADDING_Y * 2;

  return points.map((point, index) => ({
    ...point,
    x: PADDING_X + (index / (points.length - 1)) * width,
    y: PADDING_Y + height - ((point.price - min) / range) * height,
  }));
}

function buildSvgPath(points: ChartPoint[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

function findClosestPoint(points: ChartPoint[], clientX: number, rect: DOMRect): ChartPoint {
  const x = ((clientX - rect.left) / rect.width) * CHART_WIDTH;
  return points.reduce((closest, point) =>
    Math.abs(point.x - x) < Math.abs(closest.x - x) ? point : closest,
  points[0]!);
}

export function TokenChart({ chart, loading, symbol, currency = "USD" }: Props) {
  const [hovered, setHovered] = useState<ChartPoint | null>(null);
  const badge = statusBadge(chart?.sourceStatus);
  const points = useMemo(() => buildChartPoints(chart?.points ?? []), [chart?.points]);
  const path = buildSvgPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  const activePoint = hovered ?? last ?? null;
  const isUp = Boolean(first && last && last.price >= first.price);
  const strokeColor = isUp ? "#10b981" : "#f43f5e";

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-36 animate-pulse rounded bg-fuchsia-100" />
        <div className="flex h-64 w-full items-center justify-center rounded-[1.5rem] border border-fuchsia-100 bg-white/70">
          <p className="text-xs text-slate-500">Loading chart...</p>
        </div>
      </div>
    );
  }

  if (!chart || points.length < 2) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">Chart</p>
          {badge ? (
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${badge.className}`}>
              {badge.label}
            </span>
          ) : null}
        </div>
        <div className="flex h-64 w-full items-center justify-center rounded-[1.5rem] border border-fuchsia-100 bg-white/70">
          <p className="text-xs text-slate-500">No chart data for {symbol}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Price chart</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {activePoint ? formatPrice(activePoint.price, currency) : "—"}
          </p>
          <p className="text-xs text-slate-500">
            {activePoint ? formatTimestamp(activePoint.timestamp) : "Move over the chart"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {badge ? (
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${badge.className}`}>
              {badge.label}
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative rounded-[1.5rem] border border-fuchsia-100 bg-white/75 p-3 shadow-inner">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-72 w-full touch-none"
          preserveAspectRatio="none"
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setHovered(findClosestPoint(points, event.clientX, rect));
          }}
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id="token-chart-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.24" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${path} L ${points[points.length - 1]!.x.toFixed(1)} ${CHART_HEIGHT - PADDING_Y} L ${points[0]!.x.toFixed(1)} ${CHART_HEIGHT - PADDING_Y} Z`}
            fill="url(#token-chart-fill)"
          />
          <path
            d={path}
            fill="none"
            stroke={strokeColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {activePoint ? (
            <>
              <line
                x1={activePoint.x}
                x2={activePoint.x}
                y1={PADDING_Y}
                y2={CHART_HEIGHT - PADDING_Y}
                stroke="rgba(226,232,240,0.28)"
                strokeDasharray="4 6"
              />
              <circle cx={activePoint.x} cy={activePoint.y} r="6" fill={strokeColor} stroke="#fff" strokeWidth="2" />
            </>
          ) : null}
        </svg>
      </div>
    </div>
  );
}

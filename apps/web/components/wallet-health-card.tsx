"use client";

import Link from "next/link";
import type { WalletHealthSummary, WalletHealthSeverity } from "@/lib/wallet-health";

interface Props {
  summary: WalletHealthSummary;
}

function severityClass(severity: WalletHealthSeverity): string {
  switch (severity) {
    case "danger":
      return "border-rose-500/30 bg-rose-500/10 text-rose-100";
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-100";
    case "info":
      return "border-sky-500/30 bg-sky-500/10 text-sky-100";
    default:
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  }
}

export function WalletHealthCard({ summary }: Props) {
  return (
    <div className="premium-card space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Wallet health</p>
          <h2 className="text-xl font-semibold">{summary.label}</h2>
        </div>
        <div className="token-orb flex h-16 w-16 items-center justify-center text-lg font-semibold">
          {summary.score}
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-900/80">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#ff46b7,#8b5cf6,#38bdf8)]"
          style={{ width: `${summary.score}%` }}
        />
      </div>

      {summary.issues.length ? (
        <div className="space-y-2">
          {summary.issues.slice(0, 4).map((issue) => (
            <div key={issue.id} className={`rounded-2xl border p-3 text-sm ${severityClass(issue.severity)}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{issue.label}</span>
                {issue.actionHref && issue.actionLabel ? (
                  <Link href={issue.actionHref} className="text-xs underline underline-offset-4">
                    {issue.actionLabel}
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="data-card rounded-2xl p-3 text-sm text-emerald-100">
          Core wallet checks look good for this profile.
        </div>
      )}
    </div>
  );
}

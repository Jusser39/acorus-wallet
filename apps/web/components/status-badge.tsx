import type { TransactionStatus } from "@acorus/shared";

const styles: Record<TransactionStatus, string> = {
  draft: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  confirmed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  failed: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  unknown: "border-slate-500/30 bg-slate-500/10 text-slate-200",
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

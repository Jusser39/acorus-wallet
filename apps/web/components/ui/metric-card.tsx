type MetricCardProps = {
  label: string;
  value: string;
  caption?: string;
};

export function MetricCard({ label, value, caption }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--acorus-border)] bg-white/70 p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--acorus-subtle)]">
        {label}
      </div>
      <div className="mt-2 text-xl font-black tracking-tight text-[var(--acorus-text)]">
        {value}
      </div>
      {caption ? <div className="mt-1 text-xs text-[var(--acorus-muted)]">{caption}</div> : null}
    </div>
  );
}

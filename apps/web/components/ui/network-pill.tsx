type NetworkPillProps = {
  label: string;
  status?: "live" | "soon" | "disabled";
};

export function NetworkPill({ label, status = "live" }: NetworkPillProps) {
  const dot =
    status === "live"
      ? "bg-emerald-500"
      : status === "soon"
        ? "bg-amber-400"
        : "bg-slate-300";

  return (
    <span className="acorus-pill">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

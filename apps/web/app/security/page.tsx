const SECURITY_ITEMS = [
  {
    title: "Backup phrase",
    description: "Recovery phrase backup reminders and checks will live here.",
    status: "Planned",
  },
  {
    title: "Autolock",
    description: "Current wallet autolock status and timeout controls.",
    status: "Preview",
  },
  {
    title: "Hidden balance",
    description: "Quick privacy control for hiding balances.",
    status: "Live",
  },
  {
    title: "Connected sites",
    description: "dApp permissions will appear here when extension support lands.",
    status: "Planned",
  },
  {
    title: "Token approvals",
    description: "Approval risk scanner and revoke tools are planned.",
    status: "Planned",
  },
  {
    title: "Transaction warnings",
    description: "Risk labels before signing and broadcasting transactions.",
    status: "Planned",
  },
];

function getStatusTone(status: string): string {
  if (status === "Live") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }
  if (status === "Preview") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-200";
}

export default function SecurityPage() {
  return (
    <section className="page space-y-6">
      <div className="glass-panel space-y-3">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400">
          Security Center
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Safety before signatures
        </h1>
        <p className="text-sm text-slate-300">
          Acorus should never hide risk. This page will collect backup,
          permissions, approvals and transaction safety controls.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SECURITY_ITEMS.map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">
                {item.title}
              </h2>

              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusTone(item.status)}`}>
                {item.status}
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-300">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

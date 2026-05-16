const QUESTS = [
  {
    title: "Create your first wallet",
    status: "Planned",
  },
  {
    title: "Receive your first asset",
    status: "Planned",
  },
  {
    title: "Create a send draft",
    status: "Planned",
  },
  {
    title: "Preview your first swap route",
    status: "Planned",
  },
  {
    title: "Learn about seed phrase safety",
    status: "Planned",
  },
];

export default function QuestsPage() {
  return (
    <section className="page space-y-6">
      <div className="glass-panel space-y-3">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400">
          Quests
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Learn Web3 by doing
        </h1>
        <p className="text-sm text-slate-300">
          Inspired by gamified DeFi products, quests will guide users through
          safe wallet actions without pushing them into risky transactions.
        </p>
      </div>

      <div className="grid gap-3">
        {QUESTS.map((quest, index) => (
          <div
            key={quest.title}
            className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-[0_18px_48px_rgba(2,6,23,0.18)]"
          >
            <div className="text-sm text-slate-400">
              Quest {index + 1}
            </div>
            <div className="mt-1 font-semibold text-white">
              {quest.title}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {quest.status}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

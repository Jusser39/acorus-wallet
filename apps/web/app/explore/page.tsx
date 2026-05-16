const EXPLORE_SECTIONS = [
  {
    title: "Trending tokens",
    description: "Token discovery and market trends will appear here.",
    status: "Preview",
  },
  {
    title: "Meme radar",
    description: "Meme token tracking and risk labels are planned.",
    status: "Planned",
  },
  {
    title: "DeFi protocols",
    description: "Swap, liquidity, farms and pools discovery shell.",
    status: "Planned",
  },
  {
    title: "Quests",
    description: "Gamified onboarding and Web3 tasks inspired by DeFi products.",
    status: "Planned",
  },
  {
    title: "Launches",
    description: "Launchpad and springboard style discovery will be explored later.",
    status: "Planned",
  },
  {
    title: "Education",
    description: "Beginner-friendly security and DeFi guides.",
    status: "Preview",
  },
];

export default function ExplorePage() {
  return (
    <section className="page space-y-6">
      <div className="glass-panel space-y-3">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400">
          Explore
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Discover Web3 without losing the wallet context
        </h1>
        <p className="text-sm text-slate-300">
          This shell prepares token discovery, memes, DeFi protocols, launches
          and quests. It is preview-only for now.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {EXPLORE_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">
                {section.title}
              </h2>

              <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-xs font-semibold text-slate-300">
                {section.status}
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-300">
              {section.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

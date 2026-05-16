const EXTENSION_PHASES = [
  "Manifest V3 extension shell",
  "Background service worker",
  "Content script bridge",
  "Inpage provider",
  "Popup wallet UI",
  "Permission prompts",
  "Connected sites",
  "EVM provider compatibility",
  "Solana provider compatibility",
  "WalletConnect later",
];

export default function ExtensionPage() {
  return (
    <section className="page space-y-6">
      <div className="glass-panel space-y-3">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400">
          Chrome Extension
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Browser wallet roadmap
        </h1>
        <p className="text-sm text-slate-300">
          The final goal is to connect Acorus Wallet to crypto websites through
          a secure browser extension. This page tracks the architecture before
          implementation.
        </p>
      </div>

      <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-100">
        Extension is not implemented yet. Do not expose keys to websites,
        content scripts or injected providers.
      </div>

      <div className="grid gap-3">
        {EXTENSION_PHASES.map((phase, index) => (
          <div
            key={phase}
            className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-[0_18px_48px_rgba(2,6,23,0.18)]"
          >
            <div>
              <div className="text-sm text-slate-400">
                Phase {index + 1}
              </div>
              <div className="font-semibold text-white">
                {phase}
              </div>
            </div>

            <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-xs font-semibold text-slate-300">
              Planned
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

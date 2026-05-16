const EXTENSION_PHASES = [
  "Manifest V3 extension shell",
  "Background service worker",
  "Content script bridge",
  "Live preview inpage provider",
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
          Browser wallet preview bridge
        </h1>
        <p className="text-sm text-slate-300">
          Acorus Wallet now has a live preview-backed browser bridge for
          connection approval, account listing, active chain reads and
          switch-chain prompts. Signing, send execution and WalletConnect remain
          disabled.
        </p>
      </div>

      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
        Current bridge mode is preview-backed only. Websites can never reach
        mnemonic, private keys, passcode, signing payloads or transaction
        broadcast in this wave.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
          <h2 className="text-lg font-semibold text-white">Live now</h2>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-cyan-100">
            {[
              "acorus_requestAccounts",
              "acorus_accounts",
              "acorus_chainId",
              "acorus_switchChain",
            ].map((method) => (
              <span
                key={method}
                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1"
              >
                {method}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-300">
            The first live bridge layer routes page requests into the extension
            permission shell and exposes only approved preview-backed accounts
            and chains.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
          <h2 className="text-lg font-semibold text-white">Still blocked</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>Message signing</li>
            <li>Typed data signing</li>
            <li>Transaction signing</li>
            <li>Transaction broadcast</li>
            <li>WalletConnect pairing</li>
          </ul>
        </div>
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
              {index < 4 ? "Preview" : "Planned"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

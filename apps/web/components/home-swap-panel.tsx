"use client";

import { SwapComposer } from "@/components/swap-composer";
import { useActiveProfile } from "@/store/wallet-store";

export function HomeSwapPanel() {
  const activeProfile = useActiveProfile();
  const evmAddress = activeProfile?.chainFamily === "evm" ? activeProfile.publicAddress : null;

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1fr)] xl:items-start">
      <div className="app-surface subtle-grid rounded-[2rem] p-5 sm:p-7">
        <span className="section-kicker">Live swap</span>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Swap from the wallet home screen
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
          Choose a network, pick tokens, and let Acorus request the route. The extension asks for explicit approval before any approval or swap transaction is broadcast.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ["Backend quote", "Provider keys stay server-side."],
            ["Wallet approval", "Token approval and swap review are separate."],
            ["Multichain routes", "Routes are reviewed in the extension before execution is enabled."],
          ].map(([title, copy]) => (
            <div key={title} className="data-card rounded-2xl p-4">
              <p className="text-sm font-semibold text-slate-950">{title}</p>
              <p className="mt-2 text-xs leading-5 text-slate-600">{copy}</p>
            </div>
          ))}
        </div>
      </div>

      <SwapComposer
        compact
        portfolioAssets={[]}
        userAddress={evmAddress}
        title="Swap"
        description="Choose a network, token pair and amount. Acorus fetches a real route and queues the final transaction in the extension."
      />
    </section>
  );
}

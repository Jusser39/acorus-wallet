"use client";

import { AcorusMagicStage } from "@/components/acorus-magic-stage";
import { ExtensionWalletCard } from "@/components/extension-wallet-card";
import { SwapComposer } from "@/components/swap-composer";
import { useActiveProfile } from "@/store/wallet-store";

export default function SwapPage() {
  const activeProfile = useActiveProfile();
  const evmAddress =
    activeProfile?.chainFamily === "evm" ? activeProfile.publicAddress : null;

  return (
    <main className="magic-shell">
      <section className="magic-container py-8">
        <div className="magic-page-grid">
          <div className="magic-panel p-5 sm:p-7">
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-700">
                0x · Jupiter · Rango
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                Swap across every route we can safely review
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                Choose a network, pick popular tokens for that chain, then request a routed quote.
                Execution always stays behind Acorus extension approval.
              </p>
            </div>
            <SwapComposer
              portfolioAssets={[]}
              userAddress={evmAddress}
              title="Universal swap"
              description="EVM routes use backend-proxied 0x quotes. Jupiter and Rango route discovery are prepared for review-gated execution."
            />
          </div>

          <aside className="grid content-start gap-4">
            <section className="magic-panel p-4">
              <AcorusMagicStage pose="swap" compact />
            </section>
            <ExtensionWalletCard title="Extension swap account" />
          </aside>
        </div>
      </section>
    </main>
  );
}

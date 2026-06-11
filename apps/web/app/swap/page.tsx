"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AcorusMagicStage } from "@/components/acorus-magic-stage";
import { ExtensionWalletCard } from "@/components/extension-wallet-card";
import { SwapComposer } from "@/components/swap-composer";
import { useActiveProfile } from "@/store/wallet-store";

function SwapClient() {
  const activeProfile = useActiveProfile();
  const searchParams = useSearchParams();
  const evmAddress = activeProfile?.chainFamily === "evm" ? activeProfile.publicAddress : null;

  const chainIdParam = searchParams?.get("chainId");
  const sellTokenParam = searchParams?.get("sellToken");
  const buyTokenParam = searchParams?.get("buyToken");
  const buySymbolParam = searchParams?.get("buySymbol");
  const buyNameParam = searchParams?.get("buyName");

  const initialChainId = chainIdParam ? Number(chainIdParam) : undefined;
  const initialSellToken = sellTokenParam || undefined;
  const initialBuyToken = buyTokenParam || undefined;
  const initialBuyTokenMeta = initialBuyToken && buySymbolParam ? {
    symbol: buySymbolParam,
    name: buyNameParam || buySymbolParam,
    decimals: 18,
  } : undefined;

  return (
    <div className="magic-page-grid">
      <div className="magic-panel p-5 sm:p-7">
        <div className="mb-6">
          <Link href="/wallet" className="text-sm font-semibold text-slate-500 hover:text-fuchsia-700">← Back to Wallet</Link>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-violet-700">
            Acorus swap
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            Swap tokens with local wallet review
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
            Choose a network, pick popular tokens for that chain, then request a routed quote.
            Execution always stays behind Acorus extension approval.
          </p>
        </div>
        <SwapComposer
          compact
          initialChainId={initialChainId}
          initialSellToken={initialSellToken}
          initialBuyToken={initialBuyToken}
          initialBuyTokenMeta={initialBuyTokenMeta}
          portfolioAssets={[]}
          userAddress={evmAddress}
          title="Swap"
          description="Choose a network and tokens. Acorus will fetch the best available route and ask the extension to review before anything is signed."
        />
      </div>

      <aside className="grid content-start gap-4">
        <section className="magic-panel p-4">
          <AcorusMagicStage pose="swap" compact />
        </section>
        <ExtensionWalletCard title="Extension swap account" />
      </aside>
    </div>
  );
}

export default function SwapPage() {
  return (
    <main className="magic-shell">
      <section className="magic-container py-8">
        <Suspense fallback={<div className="animate-pulse h-96 rounded-2xl bg-white/20" />}>
          <SwapClient />
        </Suspense>
      </section>
    </main>
  );
}

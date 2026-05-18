"use client";

import Link from "next/link";
import { ExtensionWalletCard } from "@/components/extension-wallet-card";
import { SwapComposer } from "@/components/swap-composer";
import { TokenDiscoveryHero } from "@/components/token-discovery-hero";
import { useActiveProfile } from "@/store/wallet-store";

export default function SwapPage() {
  const activeProfile = useActiveProfile();

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8">
      {!activeProfile ? (
        <div className="panel space-y-4">
          <h1 className="text-2xl font-semibold text-white">
            No active wallet
          </h1>
          <p className="text-sm text-slate-300">
            Create, import or add a wallet before opening swap quotes.
          </p>
          <Link href="/" className="button-primary inline-flex">
            Go to onboarding
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <TokenDiscoveryHero
            compact
            eyebrow="Universal swap"
            title="Выбирайте монеты прямо на сцене и собирайте quote без чёрного плоского shell"
            description="Свап-экран переведён в более лёгкий product-style: floating token stage сверху и кликабельный token picker в самом composer ниже."
            primaryHref="/swap"
            primaryLabel="Stay on swap"
            secondaryHref="/wallet"
            secondaryLabel="Open wallet"
          />
          <ExtensionWalletCard title="Extension swap account" />
          <SwapComposer
            portfolioAssets={[]}
            userAddress={activeProfile.publicAddress}
          />
        </div>
      )}
    </section>
  );
}

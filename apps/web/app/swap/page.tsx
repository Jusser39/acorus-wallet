"use client";

import { ExtensionWalletCard } from "@/components/extension-wallet-card";
import { SwapComposer } from "@/components/swap-composer";
import { TokenDiscoveryHero } from "@/components/token-discovery-hero";
import { useActiveProfile } from "@/store/wallet-store";

export default function SwapPage() {
  const activeProfile = useActiveProfile();
  const evmAddress =
    activeProfile?.chainFamily === "evm" ? activeProfile.publicAddress : null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <TokenDiscoveryHero
          compact
          eyebrow="Universal swap"
          title="Swap across Acorus routes"
          description="0x routes execute through extension approvals. Jupiter and Rango are wired as backend quote and transaction-draft providers, so users can inspect routes before wallet execution is enabled."
          primaryHref="/swap"
          primaryLabel="Stay on swap"
          secondaryHref="/wallet"
          secondaryLabel="Open wallet"
        />
        <ExtensionWalletCard title="Extension swap account" />
        <SwapComposer
          portfolioAssets={[]}
          userAddress={evmAddress}
          title="Swap"
          description="Choose a provider route, network, token pair and amount. Quotes stay visible without a connected wallet; execution still requires Acorus extension approval."
        />
      </div>
    </section>
  );
}

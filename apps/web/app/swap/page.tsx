"use client";

import { ExtensionWalletCard } from "@/components/extension-wallet-card";
import { SwapComposer } from "@/components/swap-composer";
import { useActiveProfile } from "@/store/wallet-store";

export default function SwapPage() {
  const activeProfile = useActiveProfile();
  const evmAddress =
    activeProfile?.chainFamily === "evm" ? activeProfile.publicAddress : null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <SwapComposer
          portfolioAssets={[]}
          userAddress={evmAddress}
          title="Universal swap"
          description="Choose a network, pick popular tokens for that chain, then request a routed quote. Execution always stays behind Acorus extension approval."
        />
        <ExtensionWalletCard title="Extension swap account" />
      </div>
    </section>
  );
}

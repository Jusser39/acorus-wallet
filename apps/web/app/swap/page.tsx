"use client";

import Link from "next/link";
import { SwapComposer } from "@/components/swap-composer";
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
        <SwapComposer
          portfolioAssets={[]}
          userAddress={activeProfile.publicAddress}
        />
      )}
    </section>
  );
}

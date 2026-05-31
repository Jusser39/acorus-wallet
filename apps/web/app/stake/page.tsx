import Link from "next/link";
import { GlassCard } from "@/components/glass-card";

export const metadata = {
  title: "Stake Crypto - Acorus",
};

export default function StakePage() {
  return (
    <main className="magic-shell relative overflow-hidden px-4 py-10 min-h-screen">
      {/* Coinkeep Design Integration: Background Blobs */}
      <div className="bg-blobs">
        <div className="blob blob-green opacity-80" style={{ left: "20%", top: "10%", width: "400px", height: "400px" }}></div>
        <div className="blob blob-yellow opacity-60" style={{ right: "20%", top: "40%", width: "500px", height: "500px" }}></div>
      </div>

      <section className="magic-container relative z-10 mx-auto max-w-xl">
        <GlassCard glow className="p-8 text-center space-y-6 mt-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-3xl text-white shadow-lg shadow-emerald-500/30">
            🌱
          </div>
          
          <h1 className="text-4xl font-black glow-text-content">
            Stake Assets
          </h1>
          
          <p className="text-lg text-slate-600 font-medium">
            Earn yield on your crypto holdings directly from your Acorus wallet.
            Put your assets to work securely across multiple chains.
          </p>

          <div className="rounded-[1.5rem] border border-emerald-100 bg-white/70 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Coming Soon</h2>
            <p className="text-sm text-slate-500">
              The native staking integration is currently in development. You will soon be able to stake ETH, SOL, and more.
            </p>
          </div>

          <div className="pt-4">
            <Link href="/" className="magic-button inline-flex px-8 py-3 text-lg w-full justify-center">
              Back to Home
            </Link>
          </div>
        </GlassCard>
      </section>
    </main>
  );
}

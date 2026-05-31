import Link from "next/link";
import { GlassCard } from "@/components/glass-card";

export const metadata = {
  title: "Buy Crypto - Acorus",
};

export default function BuyPage() {
  return (
    <main className="magic-shell relative overflow-hidden px-4 py-10 min-h-screen">
      {/* Coinkeep Design Integration: Background Blobs */}
      <div className="bg-blobs">
        <div className="blob blob-pink opacity-80" style={{ left: "10%", top: "10%", width: "400px", height: "400px" }}></div>
        <div className="blob blob-blue opacity-60" style={{ right: "10%", top: "40%", width: "500px", height: "500px" }}></div>
      </div>

      <section className="magic-container relative z-10 mx-auto max-w-xl">
        <GlassCard glow className="p-8 text-center space-y-6 mt-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-400 to-violet-600 text-3xl text-white shadow-lg shadow-fuchsia-500/30">
            💳
          </div>
          
          <h1 className="text-4xl font-black glow-text-content">
            Buy Crypto
          </h1>
          
          <p className="text-lg text-slate-600 font-medium">
            Purchase crypto seamlessly using your credit card, debit card, or bank transfer. 
            We are partnering with top fiat providers to bring you the best rates.
          </p>

          <div className="rounded-[1.5rem] border border-fuchsia-100 bg-white/70 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Coming Soon</h2>
            <p className="text-sm text-slate-500">
              The direct fiat-to-crypto onramp is currently in development. Please check back later.
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

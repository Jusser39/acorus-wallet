import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stake - Acorus",
};

export default function StakePage() {
  return (
    <section className="page space-y-6">
      <div className="glass-panel space-y-3">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400">
          Earn Yield
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Stake Assets
        </h1>
        <p className="text-sm text-slate-300">
          Earn rewards by staking your crypto assets across various supported networks.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-10 text-center shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/10 text-4xl text-indigo-400">
          🌱
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">Staking Coming Soon</h2>
        <p className="mx-auto max-w-md text-sm text-slate-400">
          We are currently integrating top-tier validators and liquid staking protocols. Soon you will be able to stake Ethereum, Solana, and TON directly from your wallet with zero markup.
        </p>
        
        <div className="mt-8 grid gap-4 sm:grid-cols-3 max-w-2xl mx-auto text-left">
          <div className="rounded-2xl bg-slate-800/50 p-4 border border-slate-700/50">
            <h3 className="font-semibold text-white mb-1">Ethereum</h3>
            <p className="text-xs text-slate-400">Lido, RocketPool</p>
            <div className="mt-2 text-sm font-bold text-emerald-400">~ 3.5% APY</div>
          </div>
          <div className="rounded-2xl bg-slate-800/50 p-4 border border-slate-700/50">
            <h3 className="font-semibold text-white mb-1">Solana</h3>
            <p className="text-xs text-slate-400">Jito, Marinade</p>
            <div className="mt-2 text-sm font-bold text-emerald-400">~ 7.2% APY</div>
          </div>
          <div className="rounded-2xl bg-slate-800/50 p-4 border border-slate-700/50">
            <h3 className="font-semibold text-white mb-1">TON</h3>
            <p className="text-xs text-slate-400">Tonstakers</p>
            <div className="mt-2 text-sm font-bold text-emerald-400">~ 4.1% APY</div>
          </div>
        </div>

        <button className="mt-8 rounded-full bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
          Notify Me When Live
        </button>
      </div>
    </section>
  );
}

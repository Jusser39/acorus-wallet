import { GradientButton } from "@/components/ui/gradient-button";
import { MetricCard } from "@/components/ui/metric-card";
import { NetworkPill } from "@/components/ui/network-pill";
import { PremiumCard } from "@/components/ui/premium-card";
import { StatusBanner } from "@/components/ui/status-banner";

export default function DesignSystemPage() {
  return (
    <main className="acorus-shell">
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10">
        <div className="acorus-card p-7">
          <span className="section-kicker">Acorus design system</span>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-[var(--acorus-text)]">
            Premium white and violet wallet shell
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--acorus-muted)]">
            Reusable tokens and components for wallet, swap, token research, extension and approval surfaces.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <PremiumCard className="grid gap-3 p-5">
            <h2 className="text-lg font-black">Buttons</h2>
            <GradientButton>Primary action</GradientButton>
            <GradientButton variant="secondary">Secondary action</GradientButton>
            <GradientButton variant="danger">Danger action</GradientButton>
          </PremiumCard>

          <PremiumCard className="grid gap-3 p-5">
            <h2 className="text-lg font-black">Network Pills</h2>
            <NetworkPill label="EVM 0x live" />
            <NetworkPill label="Jupiter review" status="soon" />
            <NetworkPill label="TON gated" status="disabled" />
          </PremiumCard>

          <PremiumCard className="grid gap-3 p-5">
            <h2 className="text-lg font-black">Status</h2>
            <StatusBanner title="Quote ready" message="Route details are ready for extension review." tone="success" />
            <StatusBanner title="Adapter gated" message="Execution stays disabled until the chain adapter is reviewed." tone="warning" />
          </PremiumCard>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Market cap" value="$256.8B" caption="CoinGecko enriched" />
          <MetricCard label="24h volume" value="$405.6M" caption="Live provider" />
          <MetricCard label="Route" value="0x + Acorus" caption="Backend proxy" />
        </div>

        <PremiumCard className="p-5">
          <div className="grid gap-3">
            {["Ethereum", "Solana", "Venice Token"].map((name, index) => (
              <div
                key={name}
                className="explore-row rounded-2xl border border-fuchsia-100"
              >
                <span className="w-7 text-right text-xs font-semibold text-slate-400">{index + 1}</span>
                <span className="token-orb h-10 w-10 text-xs font-bold">{name.slice(0, 3).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-950">{name}</span>
                  <span className="block text-xs text-slate-500">Token row surface</span>
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">+2.4%</span>
              </div>
            ))}
          </div>
        </PremiumCard>

        <PremiumCard className="grid gap-4 p-5 md:grid-cols-2">
          <div className="rounded-3xl border border-fuchsia-100 bg-white/70 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--acorus-subtle)]">Approval</p>
            <h2 className="mt-2 text-2xl font-black">Review 0x swap</h2>
            <p className="mt-2 text-sm text-[var(--acorus-muted)]">
              Sanitized approval card, no raw calldata, no provider secrets, explicit user confirmation.
            </p>
          </div>
          <div className="rounded-3xl border border-fuchsia-100 bg-white/70 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--acorus-subtle)]">Skeleton</p>
            <div className="mt-4 grid gap-3">
              <div className="acorus-skeleton h-4 w-2/3 rounded-full" />
              <div className="acorus-skeleton h-4 w-1/2 rounded-full" />
              <div className="acorus-skeleton h-16 rounded-2xl" />
            </div>
          </div>
        </PremiumCard>
      </section>
    </main>
  );
}

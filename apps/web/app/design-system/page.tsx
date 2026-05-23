import { AcorusMage } from "@/components/acorus-mage";
import { GradientButton } from "@/components/ui/gradient-button";
import { StatusBanner } from "@/components/ui/status-banner";

export default function DesignSystemPage() {
  return (
    <main className="magic-shell">
      <section className="magic-container grid gap-6 py-10">
        <div className="magic-panel p-7">
          <span className="text-xs font-black uppercase tracking-[0.28em] text-violet-700">
            Acorus Magic Glass
          </span>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
            Cyber glass wallet surfaces
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Reusable visual language for wallet onboarding, swaps, approvals,
            extension popup, market discovery and token research pages.
          </p>
        </div>

        <section className="magic-home-stage min-h-[520px]">
          <div className="magic-home-grid !min-h-[520px]">
            <div className="magic-home-side">
              <div className="magic-mini-panel p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">Character system</p>
                <h2 className="mt-2 text-2xl font-black">Acorus Guardian</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  A custom CSS/SVG mascot anchors the product identity without depending on copied brand assets.
                </p>
              </div>
            </div>
            <div className="magic-stage-center !min-h-[460px]">
              <AcorusMage compact />
            </div>
            <div className="magic-home-side">
              <div className="magic-mini-panel p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">Visual language</p>
                <h2 className="mt-2 text-2xl font-black">Compact cyber glass</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Cyan glow, violet depth, pink energy and readable white surfaces across all wallet pages.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <section className="magic-panel grid gap-3 p-5">
            <h2 className="text-lg font-black">Swap panel</h2>
            <div className="rounded-3xl border border-white/60 bg-white/45 p-4">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">You pay</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-3xl font-black">0</span>
                <span className="magic-token-chip px-3 py-2 text-sm font-black">ETH</span>
              </div>
            </div>
            <div className="rounded-3xl border border-white/60 bg-white/45 p-4">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">You receive</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-3xl font-black">—</span>
                <span className="magic-token-chip px-3 py-2 text-sm font-black">USDC</span>
              </div>
            </div>
            <button type="button" className="magic-button px-4 py-3">Get quote</button>
          </section>

          <section className="magic-panel grid gap-3 p-5">
            <h2 className="text-lg font-black">Unlock state</h2>
            <div className="magic-orb mx-auto h-16 w-16 text-xl font-black text-white">A</div>
            <p className="text-center text-sm leading-6 text-slate-600">
              Local decryption card with onboarding, locked and repair states.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {["", "", "", ""].map((_, index) => (
                <span key={index} className="mx-auto h-3 w-3 rounded-full bg-violet-400" />
              ))}
            </div>
          </section>

          <section className="magic-panel grid gap-3 p-5">
            <h2 className="text-lg font-black">Approval review</h2>
            <StatusBanner
              title="Review required"
              message="Every swap, approval and send is shown in a sanitized card before execution."
              tone="warning"
            />
            <GradientButton>Confirm</GradientButton>
            <GradientButton variant="secondary">Reject</GradientButton>
          </section>
        </div>

        <section className="magic-panel p-5">
          <h2 className="text-2xl font-black">Wallet dashboard</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_0.8fr]">
            <div className="rounded-3xl border border-white/60 bg-white/45 p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">Balance</p>
              <div className="mt-3 text-5xl font-black">$45.16</div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button type="button" className="magic-button px-4 py-4">Send</button>
                <button type="button" className="magic-button-secondary px-4 py-4">Receive</button>
              </div>
            </div>
            <div className="rounded-3xl border border-white/60 bg-white/45 p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">Activity</p>
              <div className="mt-4 grid gap-3">
                {["ETH received", "USDC approval", "0x quote"].map((item) => (
                  <div key={item} className="rounded-2xl bg-white/50 p-3 text-sm font-bold">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="magic-panel p-5">
          <h2 className="text-2xl font-black">Token chips and skeletons</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {["ETH", "SOL", "BTC", "USDC", "0x"].map((symbol) => (
              <span key={symbol} className="magic-token-chip px-4 py-2 text-sm font-black">
                {symbol}
              </span>
            ))}
          </div>
          <div className="mt-5 grid gap-3">
            <div className="acorus-skeleton h-4 w-2/3 rounded-full" />
            <div className="acorus-skeleton h-4 w-1/2 rounded-full" />
            <div className="acorus-skeleton h-16 rounded-2xl" />
          </div>
        </section>
      </section>
    </main>
  );
}

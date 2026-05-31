import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buy Crypto - Acorus",
};

export default function BuyPage() {
  return (
    <section className="page space-y-6">
      <div className="glass-panel space-y-3">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400">
          Fiat On-Ramp
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Buy Crypto
        </h1>
        <p className="text-sm text-slate-300">
          Purchase cryptocurrency directly with your credit card, debit card, or bank transfer.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-10 text-center shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10 text-4xl text-blue-400">
          💳
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">Fiat On-Ramp Coming Soon</h2>
        <p className="mx-auto max-w-md text-sm text-slate-400">
          We are partnering with top fiat providers like MoonPay, Ramp, and Transak to offer seamless purchases directly into your Acorus wallet.
        </p>
        
        <div className="mt-8 flex flex-wrap justify-center gap-6 max-w-lg mx-auto">
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-20 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
              MoonPay
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-20 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
              Ramp
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-20 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
              Transak
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-2xl bg-blue-500/10 p-5 border border-blue-500/20 max-w-lg mx-auto text-left">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">Supported Payment Methods (Planned)</h3>
          <ul className="text-sm text-slate-300 space-y-2">
            <li className="flex items-center gap-2">✓ Credit / Debit Cards (Visa, Mastercard)</li>
            <li className="flex items-center gap-2">✓ Apple Pay & Google Pay</li>
            <li className="flex items-center gap-2">✓ Bank Transfers (SEPA, ACH)</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

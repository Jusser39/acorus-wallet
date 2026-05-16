export default function DappsPage() {
  return (
    <section className="page space-y-6">
      <div className="glass-panel space-y-3">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400">
          dApps
        </p>
        <h1 className="text-3xl font-semibold text-white">
          dApp connections are coming later
        </h1>
        <p className="text-sm text-slate-300">
          This shell prepares connected sites, permission prompts, signing
          requests and browser extension integration.
        </p>
      </div>

      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
        No website can access your keys. Future dApp connections will require
        explicit approval, visible origin, account permissions and transaction
        review.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
          <h2 className="text-lg font-semibold text-white">
            Connected sites
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Empty for now. Chrome extension support is required before real site
            connections.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
          <h2 className="text-lg font-semibold text-white">
            Permission model
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Future prompts will show origin, requested accounts, networks and
            allowed methods.
          </p>
        </div>
      </div>
    </section>
  );
}

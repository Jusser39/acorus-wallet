"use client";

import { useRouter } from "next/navigation";
import { useWalletStore } from "@/store/wallet-store";
import { saveLocalSettings } from "@/lib/storage";

const SECURITY_ITEMS = [
  {
    title: "Backup phrase",
    description: "Recovery phrase backup reminders and checks will live here.",
    status: "Planned",
  },
  {
    title: "Hidden balance",
    description: "Quick privacy control for hiding balances.",
    status: "Live",
  },
  {
    title: "Connected sites",
    description: "dApp permissions will appear here when extension support lands.",
    status: "Planned",
  },
  {
    title: "Token approvals",
    description: "Approval risk scanner and revoke tools are planned.",
    status: "Planned",
  },
  {
    title: "Transaction warnings",
    description: "Risk labels before signing and broadcasting transactions.",
    status: "Planned",
  },
];

const AUTOLOCK_OPTIONS = [
  { label: "1 minute", value: 1 },
  { label: "5 minutes", value: 5 },
  { label: "10 minutes", value: 10 },
  { label: "30 minutes", value: 30 },
];

function getStatusTone(status: string): string {
  if (status === "Live") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }
  if (status === "Preview") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-200";
}

export default function SecurityPage() {
  const router = useRouter();
  const lockWallet = useWalletStore((state) => state.lockWallet);
  const autoLockMinutes = useWalletStore((state) => state.autoLockMinutes);
  const setAutoLockMinutes = useWalletStore((state) => state.setAutoLockMinutes);
  const safetyMode = useWalletStore((state) => state.safetyMode);

  function handleQuickLock() {
    lockWallet();
    router.push("/unlock");
  }

  function handleAutoLockChange(minutes: number) {
    setAutoLockMinutes(minutes);
    saveLocalSettings({ autoLockMinutes: minutes, safetyMode });
  }

  return (
    <section className="page space-y-6">
      <div className="glass-panel space-y-3">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400">
          Security Center
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Safety before signatures
        </h1>
        <p className="text-sm text-slate-300">
          Acorus should never hide risk. This page collects backup, permissions,
          approvals and transaction safety controls.
        </p>
      </div>

      {/* Live controls */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
        <h2 className="text-lg font-semibold text-white">Wallet Lock</h2>

        {/* Quick lock */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-200">Quick lock</p>
            <p className="text-xs text-slate-500">Lock the wallet immediately and go to unlock screen.</p>
          </div>
          <button
            type="button"
            onClick={handleQuickLock}
            className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-300 transition hover:bg-rose-500/20"
          >
            🔒 Lock now
          </button>
        </div>

        {/* Autolock */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-200">Autolock timeout</p>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                Active · {autoLockMinutes} min
              </span>
            </div>
            <p className="text-xs text-slate-500">Auto-lock after this many minutes of inactivity.</p>
          </div>
          <select
            value={autoLockMinutes}
            onChange={(e) => handleAutoLockChange(Number(e.target.value))}
            className="rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            {AUTOLOCK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feature status cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SECURITY_ITEMS.map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">
                {item.title}
              </h2>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusTone(item.status)}`}>
                {item.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-300">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

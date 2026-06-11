import React, { useState } from "react";
import { KeyRound, ShieldCheck, X, Check } from "lucide-react";
import type { SignerUnlockIntent } from "../../shared/protocol";
import { confirmSignerUnlock, rejectSignerUnlock } from "../api";

export function SignerUnlockApproval({
  intent,
  onComplete,
}: {
  intent: SignerUnlockIntent;
  onComplete: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await confirmSignerUnlock(intent.id);
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to confirm signing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await rejectSignerUnlock(intent.id);
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to reject signing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 relative z-50 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="p-6 text-white text-center bg-emerald-600 dark:bg-emerald-900">
        <div className="flex justify-center mb-4">
          <KeyRound className="w-16 h-16" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Final Wallet Confirmation
        </h2>
        <p className="text-sm opacity-90 max-w-[280px] mx-auto">
          Confirm inside Acorus Wallet before a signature or transaction hash is returned.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3 text-emerald-900">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm leading-relaxed">
            This is the second approval gate. The dApp will receive only the final approved result.
            Your seed phrase, private keys and passcode never leave the extension wallet.
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950/50 shadow-sm">
          <div className="bg-slate-50 dark:bg-slate-900 p-3 border-b border-slate-100 dark:border-slate-800 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">
            Request
          </div>
          <div className="p-4 space-y-3">
            <InfoRow label="Kind" value={intent.kind.replace(/_/g, " ")} />
            <InfoRow label="Origin" value={intent.origin} mono />
            {intent.account ? <InfoRow label="Account" value={intent.account} mono /> : null}
            {intent.chainId !== null && intent.chainId !== undefined ? (
              <InfoRow label="Chain" value={String(intent.chainId)} />
            ) : null}
            <InfoRow label="Summary" value={intent.summary} />
            {intent.warning ? <InfoRow label="Warning" value={intent.warning} /> : null}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-white dark:bg-slate-950">
        <button
          onClick={handleReject}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
          Reject
        </button>
        <button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-white bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-700 dark:hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
          Confirm
        </button>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <span className={`text-sm text-slate-700 dark:text-slate-300 break-all ${mono ? "font-mono" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}

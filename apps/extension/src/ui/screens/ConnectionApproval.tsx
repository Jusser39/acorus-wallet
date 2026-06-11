import React, { useState } from "react";
import { Link2, X, Check, Globe } from "lucide-react";
import type { DappSessionProposal } from "@acorus/shared";
import { approveProposal, rejectProposal } from "../api";

export function ConnectionApproval({
  proposal,
  onComplete,
}: {
  proposal: DappSessionProposal;
  onComplete: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await approveProposal(proposal.id);
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to approve connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await rejectProposal(proposal.id);
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to reject connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 relative z-50 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="p-6 text-white text-center transition-colors duration-300 bg-blue-600 dark:bg-blue-900">
        <div className="flex justify-center mb-4">
          <Link2 className="w-16 h-16" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Connection Request
        </h2>
        <p className="text-sm opacity-90 max-w-[250px] mx-auto">
          {proposal.origin.origin} wants to connect to your wallet.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex gap-3 text-slate-700 dark:text-slate-300">
          <Globe className="w-5 h-5 text-blue-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              {proposal.origin.title || proposal.origin.origin}
            </p>
            <p className="text-xs leading-relaxed opacity-80">
              This site is requesting access to view your selected account address and active network.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="bg-slate-50 dark:bg-slate-900 p-3 border-b border-slate-100 dark:border-slate-800 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">
            Permissions Requested
          </div>
          <div className="p-4 flex flex-col gap-2">
            {(proposal.requestedPermissions.length > 0
              ? proposal.requestedPermissions
              : ["view_accounts" as const]
            ).map((perm) => (
              <div key={perm} className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500" />
                {perm.replace(/_/g, " ")}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-white dark:bg-slate-950 transition-colors duration-300">
        <button
          onClick={handleReject}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
          Cancel
        </button>
        <button
          onClick={handleApprove}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-white transition-all shadow-lg bg-blue-600 hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 shadow-blue-500/20 disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
          Connect
        </button>
      </div>
    </div>
  );
}

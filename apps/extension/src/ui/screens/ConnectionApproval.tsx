import React, { useState } from "react";
import { Link2, ShieldCheck, X, Check, Globe } from "lucide-react";
import type { DappSessionProposal } from "../../shared/protocol";

export function ConnectionApproval({ 
  proposal, 
  onComplete 
}: { 
  proposal: DappSessionProposal; 
  onComplete: () => void 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await chrome.runtime.sendMessage({
        kind: "resolve_proposal",
        proposalId: proposal.id,
        decision: "approve"
      });
      onComplete();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await chrome.runtime.sendMessage({
        kind: "resolve_proposal",
        proposalId: proposal.id,
        decision: "reject"
      });
      onComplete();
    } catch (e) {
      console.error(e);
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
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex gap-3 text-slate-700 dark:text-slate-300">
          <Globe className="w-5 h-5 text-blue-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{proposal.origin.title || proposal.origin.origin}</p>
            <p className="text-xs leading-relaxed opacity-80">This site is requesting access to view your account address and balance.</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="bg-slate-50 dark:bg-slate-900 p-3 border-b border-slate-100 dark:border-slate-800 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">
            Permissions Requested
          </div>
          <div className="p-4 flex flex-col gap-2">
            {proposal.requestedPermissions.map((perm) => (
              <div key={perm} className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500" />
                {perm.replace(/_/g, " ")}
              </div>
            ))}
            {proposal.requestedPermissions.length === 0 && (
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500" />
                View account address
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-white dark:bg-slate-950 transition-colors duration-300">
        <button 
          onClick={handleReject}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
          Cancel
        </button>
        <button 
          onClick={handleApprove}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-white transition-all shadow-lg bg-blue-600 hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 shadow-blue-500/20"
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

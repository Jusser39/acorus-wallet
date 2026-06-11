import React, { useMemo, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import type { DappRequest, DappRequestReviewDetails } from "@acorus/shared";
import { approveRequest, rejectRequest } from "../api";

export function Approval({
  request,
  onComplete,
}: {
  request: DappRequest;
  onComplete: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const riskWarning = request.warning ?? "Review this request carefully before approving.";
  const isHighRisk = useMemo(() => {
    const warning = riskWarning.toLowerCase();
    const labels = request.reviewDetails && "riskLabels" in request.reviewDetails
      ? request.reviewDetails.riskLabels.map((label) => label.toLowerCase())
      : [];

    return (
      warning.includes("unlimited")
      || warning.includes("calldata")
      || warning.includes("irreversible")
      || labels.some((label) =>
        label.includes("high")
        || label.includes("custom")
        || label.includes("unlimited"),
      )
    );
  }, [request.reviewDetails, riskWarning]);

  const handleApprove = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await approveRequest(request.id);
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to approve request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await rejectRequest(request.id);
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to reject request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = getRequestTitle(request.kind);
  const approveLabel = getApproveLabel(request.kind);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 relative z-50 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className={`p-6 text-white text-center transition-colors duration-300 ${isHighRisk ? "bg-red-600 dark:bg-red-900" : "bg-violet-600 dark:bg-violet-900"}`}>
        <div className="flex justify-center mb-4">
          {isHighRisk ? (
            <ShieldAlert className="w-16 h-16 animate-pulse" />
          ) : (
            <ShieldCheck className="w-16 h-16" />
          )}
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          {isHighRisk ? "Scam Warning" : title}
        </h2>
        <p className="text-sm opacity-90 max-w-[280px] mx-auto">
          {request.origin.origin} is requesting {title.toLowerCase()}.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className={`${isHighRisk ? "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-200" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"} border rounded-xl p-4 flex gap-3`}>
          {isHighRisk ? (
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
          )}
          <p className="text-sm leading-relaxed">{riskWarning}</p>
        </div>

        <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950/50 shadow-sm">
          <div className="bg-slate-50 dark:bg-slate-900 p-3 border-b border-slate-100 dark:border-slate-800 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">
            Request Summary
          </div>
          <div className="p-4 space-y-3">
            <InfoRow label="Action" value={request.kind.replace(/_/g, " ")} />
            <InfoRow label="Origin" value={request.origin.origin} mono />
            {request.account ? <InfoRow label="Account" value={request.account} mono /> : null}
            {request.chainId !== null && request.chainId !== undefined ? (
              <InfoRow label="Chain" value={String(request.chainId)} />
            ) : null}
            <InfoRow label="Summary" value={request.summary} />
          </div>
        </div>

        {request.reviewDetails ? (
          <ReviewDetails details={request.reviewDetails} />
        ) : null}
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-white dark:bg-slate-950 transition-colors duration-300">
        <button
          onClick={handleReject}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
          Reject
        </button>
        <button
          onClick={handleApprove}
          disabled={isSubmitting}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-white transition-all shadow-lg disabled:opacity-50 ${
            isHighRisk
              ? "bg-red-600 hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600 shadow-red-500/20"
              : "bg-violet-600 hover:bg-violet-500 dark:bg-violet-700 dark:hover:bg-violet-600 shadow-violet-500/20"
          }`}
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
          {isHighRisk ? "Accept Risk" : approveLabel}
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

function ReviewDetails({ details }: { details: DappRequestReviewDetails }) {
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="bg-slate-50 dark:bg-slate-900 p-3 border-b border-slate-100 dark:border-slate-800 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">
        Review Details
      </div>
      <div className="p-4 space-y-3">
        {Object.entries(details).map(([key, value]) => {
          if (key === "riskLabels") {
            const labels = Array.isArray(value) ? value : [];
            return (
              <div key={key} className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <span
                    key={String(label)}
                    className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200"
                  >
                    {String(label)}
                  </span>
                ))}
              </div>
            );
          }

          return (
            <InfoRow
              key={key}
              label={key.replace(/([A-Z])/g, " $1")}
              value={typeof value === "string" ? value : JSON.stringify(value)}
              mono={String(value).startsWith("0x")}
            />
          );
        })}
      </div>
    </div>
  );
}

function getRequestTitle(kind: DappRequest["kind"]): string {
  switch (kind) {
    case "add_chain":
      return "Add Network";
    case "watch_asset":
      return "Watch Asset";
    case "multichain_send":
      return "Send Request";
    case "swap":
      return "Swap Request";
    case "sign_message":
      return "Signature Request";
    case "sign_typed_data":
      return "Typed Data Signature";
    case "sign_transaction":
      return "Transaction Signature";
    case "send_transaction":
      return "Transaction Request";
    case "ton_connect":
      return "TON Connection Request";
    case "ton_send_transaction":
      return "TON Transaction Request";
    case "ton_disconnect":
      return "TON Disconnect Request";
    default:
      return "Wallet Request";
  }
}

function getApproveLabel(kind: DappRequest["kind"]): string {
  switch (kind) {
    case "swap":
      return "Review Swap";
    case "send_transaction":
    case "multichain_send":
    case "ton_send_transaction":
      return "Continue";
    case "sign_message":
    case "sign_typed_data":
    case "sign_transaction":
      return "Continue";
    case "ton_connect":
      return "Connect";
    default:
      return "Approve";
  }
}

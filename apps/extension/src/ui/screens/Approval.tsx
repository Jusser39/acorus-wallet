import React, { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, Check, X } from "lucide-react";
import type { DappRequest, BackgroundStateSnapshot } from "../../shared/protocol";
import { buildApprovalRiskWarning } from "../../background/request-risk";
import { getBackgroundState } from "../api";

export function Approval({ request, onComplete }: { request: DappRequest; onComplete: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const riskWarning = buildApprovalRiskWarning({
    method: request.method,
    params: request.params
  });

  const isHighRisk = riskWarning.includes("unlimited") || riskWarning.includes("Contract calldata is present");

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await chrome.runtime.sendMessage({
        kind: "resolve_request",
        requestId: request.id,
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
        kind: "resolve_request",
        requestId: request.id,
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
    <div className="flex flex-col h-full bg-white relative z-50">
      <div className={`p-6 text-white text-center ${isHighRisk ? "bg-red-600" : "bg-violet-600"}`}>
        <div className="flex justify-center mb-4">
          {isHighRisk ? <ShieldAlert className="w-16 h-16 animate-pulse" /> : <ShieldCheck className="w-16 h-16" />}
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          {isHighRisk ? "Scam Warning" : (request.kind === "ton_connect" ? "TON Connection Request" : "Signature Request")}
        </h2>
        <p className="text-sm opacity-90 max-w-[250px] mx-auto">
          {request.origin} is requesting a {request.kind === "ton_connect" ? "connection to TON" : "signature"}.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {isHighRisk && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-red-900">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm leading-relaxed">{riskWarning}</p>
          </div>
        )}

        {!isHighRisk && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700">
            <p className="text-sm leading-relaxed">{riskWarning}</p>
          </div>
        )}

        <div className="rounded-xl border border-slate-100 overflow-hidden">
          <div className="bg-slate-50 p-3 border-b border-slate-100 font-mono text-xs text-slate-500 uppercase font-semibold">
            Raw Data
          </div>
          <div className="p-4 overflow-x-auto">
            <pre className="text-[10px] font-mono text-slate-700 whitespace-pre-wrap break-all">
              {JSON.stringify(request.params, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 flex gap-3 bg-white">
        <button 
          onClick={handleReject}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
          Reject
        </button>
        <button 
          onClick={handleApprove}
          disabled={isSubmitting}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-white transition-colors ${
            isHighRisk ? "bg-red-600 hover:bg-red-700" : "bg-violet-600 hover:bg-violet-700"
          }`}
        >
          <Check className="w-5 h-5" />
          {isHighRisk ? "Accept Risk" : (request.kind === "ton_connect" ? "Connect" : "Sign")}
        </button>
      </div>
    </div>
  );
}

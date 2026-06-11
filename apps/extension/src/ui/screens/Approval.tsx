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

  const isSendTransaction = request.kind === "send_transaction" || request.kind === "sign_transaction";
  const transactionParams = isSendTransaction && Array.isArray(request.params) && request.params[0] && typeof request.params[0] === 'object' ? request.params[0] as any : null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 relative z-50 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className={`p-6 text-white text-center transition-colors duration-300 ${isHighRisk ? "bg-red-600 dark:bg-red-900" : "bg-violet-600 dark:bg-violet-900"}`}>
        <div className="flex justify-center mb-4">
          {isHighRisk ? <ShieldAlert className="w-16 h-16 animate-pulse" /> : <ShieldCheck className="w-16 h-16" />}
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          {isHighRisk ? "Scam Warning" : (request.kind === "ton_connect" ? "TON Connection Request" : isSendTransaction ? "Transaction Request" : "Signature Request")}
        </h2>
        <p className="text-sm opacity-90 max-w-[250px] mx-auto">
          {request.origin} is requesting a {request.kind === "ton_connect" ? "connection to TON" : isSendTransaction ? "transaction" : "signature"}.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {isHighRisk && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 rounded-xl p-4 flex gap-3 text-red-900 dark:text-red-200">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-sm leading-relaxed">{riskWarning}</p>
          </div>
        )}

        {!isHighRisk && (
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-slate-700 dark:text-slate-300">
            <p className="text-sm leading-relaxed">{riskWarning}</p>
          </div>
        )}

        {transactionParams && (
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950/50 shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-900 p-3 border-b border-slate-100 dark:border-slate-800 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">
              Transaction Details
            </div>
            <div className="p-4 space-y-3">
              {transactionParams.to && (
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Target (To)</span>
                  <span className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate">{transactionParams.to}</span>
                </div>
              )}
              {transactionParams.value && transactionParams.value !== "0x0" && (
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Native Value</span>
                  <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{transactionParams.value}</span>
                </div>
              )}
              {transactionParams.data && transactionParams.data !== "0x" && (
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Calldata</span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 break-all line-clamp-3">{transactionParams.data}</span>
                </div>
              )}
              <div className="flex gap-4">
                {transactionParams.gas && (
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Gas Limit</span>
                    <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{transactionParams.gas}</span>
                  </div>
                )}
                {transactionParams.gasPrice && (
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Gas Price</span>
                    <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{transactionParams.gasPrice}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="bg-slate-50 dark:bg-slate-900 p-3 border-b border-slate-100 dark:border-slate-800 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">
            Raw Data
          </div>
          <div className="p-4 overflow-x-auto">
            <pre className="text-[10px] font-mono text-slate-700 dark:text-slate-400 whitespace-pre-wrap break-all">
              {JSON.stringify(request.params, null, 2)}
            </pre>
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
          Reject
        </button>
        <button 
          onClick={handleApprove}
          disabled={isSubmitting}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-white transition-all shadow-lg ${
            isHighRisk ? "bg-red-600 hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600 shadow-red-500/20" : "bg-violet-600 hover:bg-violet-500 dark:bg-violet-700 dark:hover:bg-violet-600 shadow-violet-500/20"
          }`}
        >
          {isSubmitting ? (
             <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
          {isHighRisk ? "Accept Risk" : (request.kind === "ton_connect" ? "Connect" : isSendTransaction ? "Send" : "Sign")}
        </button>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";
import { createWallet } from "../api";

export function CreateWallet({ onBack, onComplete }: { onBack: () => void, onComplete: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = async () => {
    if (passcode.length < 6) {
      setError("Passcode must be at least 6 characters.");
      return;
    }
    if (passcode !== confirmPasscode) {
      setError("Passcodes do not match.");
      return;
    }
    
    setError(null);
    setLoading(true);
    try {
      const response = await createWallet("My Wallet", passcode);
      if (response.ok) {
        setMnemonic(response.result.mnemonic);
        setStep(2);
      } else {
        setError(response.errorMessage || "Failed to create wallet");
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900">
      <header className="flex items-center p-4 border-b border-slate-100 bg-white">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 transition-colors mr-2">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="font-bold text-lg">Create Wallet</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div className="text-center mb-2">
              <h2 className="text-xl font-bold mb-2">Protect your wallet</h2>
              <p className="text-sm text-slate-500">Create a passcode to unlock your Acorus extension on this device.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 ml-1">New Passcode</label>
                <input 
                  type="password" 
                  value={passcode}
                  onChange={e => setPasscode(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 ml-1">Confirm Passcode</label>
                <input 
                  type="password" 
                  value={confirmPasscode}
                  onChange={e => setConfirmPasscode(e.target.value)}
                  placeholder="Repeat passcode"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
              </div>
              {error && <p className="text-sm text-red-500 ml-1">{error}</p>}
            </div>

            <button 
              onClick={handleNext}
              disabled={loading || !passcode || !confirmPasscode}
              className="mt-auto w-full py-3.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              {loading ? "Creating..." : "Next"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6 h-full">
            <div className="text-center mb-2">
              <h2 className="text-xl font-bold mb-2">Secret Recovery Phrase</h2>
              <p className="text-sm text-slate-500">Write down these 12 words and keep them safe. Anyone with these words can control your assets.</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-red-700 text-sm">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <p>Never share this phrase with anyone! Acorus support will never ask for it.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {mnemonic?.split(" ").map((word, i) => (
                <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 p-2.5 rounded-lg shadow-sm">
                  <span className="text-slate-400 text-xs w-4 text-right">{i + 1}.</span>
                  <span className="font-mono font-medium text-slate-800">{word}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-8">
              <button 
                onClick={onComplete}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                I've saved it securely
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

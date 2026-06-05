import React, { useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { importWallet } from "../api";

export function ImportWallet({ onBack, onComplete }: { onBack: () => void, onComplete: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (passcode.length < 6) {
      setError("Passcode must be at least 6 characters.");
      return;
    }
    if (passcode !== confirmPasscode) {
      setError("Passcodes do not match.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleImport = async () => {
    const trimmedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
    if (trimmedMnemonic.split(" ").length !== 12 && trimmedMnemonic.split(" ").length !== 24) {
      setError("Mnemonic must be 12 or 24 words.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const response = await importWallet("My Wallet", trimmedMnemonic, passcode);
      if (response.ok) {
        onComplete();
      } else {
        setError(response.errorMessage || "Failed to import wallet. Ensure the phrase is correct.");
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
        <button onClick={step === 1 ? onBack : () => setStep(1)} className="p-2 rounded-full hover:bg-slate-100 transition-colors mr-2">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="font-bold text-lg">Import Wallet</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {step === 1 && (
          <div className="flex flex-col gap-6 h-full">
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
              disabled={!passcode || !confirmPasscode}
              className="mt-auto w-full py-3.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6 h-full">
            <div className="text-center mb-2">
              <h2 className="text-xl font-bold mb-2">Secret Recovery Phrase</h2>
              <p className="text-sm text-slate-500">Paste your 12 or 24 word mnemonic phrase below.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <textarea 
                value={mnemonic}
                onChange={e => setMnemonic(e.target.value)}
                placeholder="apple banana cherry..."
                className="w-full h-32 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none font-mono text-sm"
              />
              {error && <p className="text-sm text-red-500 ml-1 mt-1">{error}</p>}
            </div>

            <div className="mt-auto pt-8">
              <button 
                onClick={handleImport}
                disabled={loading || !mnemonic}
                className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? "Importing..." : "Import Wallet"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

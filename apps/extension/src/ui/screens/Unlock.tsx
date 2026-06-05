import React, { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { unlockWallet } from "../api";

export function Unlock({ onUnlock }: { onUnlock: () => void }) {
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async () => {
    if (!passcode) return;
    
    setError(null);
    setLoading(true);
    try {
      const response = await unlockWallet(passcode);
      if (response.ok) {
        onUnlock();
      } else {
        setError("Incorrect passcode");
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleUnlock();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 items-center justify-center p-6">
      <div className="w-20 h-20 bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-3xl flex items-center justify-center shadow-lg mb-8 transform rotate-3">
        <span className="text-white font-black text-4xl transform -rotate-3">A</span>
      </div>
      
      <h1 className="text-2xl font-bold tracking-tight mb-2">Welcome Back</h1>
      <p className="text-sm text-slate-500 mb-8 text-center">Enter your passcode to unlock Acorus.</p>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="password" 
            value={passcode}
            onChange={e => setPasscode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Passcode"
            autoFocus
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-lg tracking-widest"
          />
        </div>
        
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <button 
          onClick={handleUnlock}
          disabled={loading || !passcode}
          className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-md transition-all active:scale-[0.98] mt-2"
        >
          {loading ? "Unlocking..." : "Unlock"}
        </button>
      </div>

      <div className="mt-12 text-center">
        <button className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors">
          Forgot passcode?
        </button>
      </div>
    </div>
  );
}

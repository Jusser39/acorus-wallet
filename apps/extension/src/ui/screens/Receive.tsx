import React from "react";
import { ArrowLeft } from "lucide-react";

export function Receive({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white relative">
      <header className="flex items-center justify-between p-4 border-b border-slate-100">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h1 className="font-bold text-lg">Receive</h1>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-center mt-10 text-slate-400">
          Select asset to receive...
        </div>
      </div>
    </div>
  );
}

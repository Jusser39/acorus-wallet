import React from "react";
import { PlusCircle, Import } from "lucide-react";

export function Welcome({ onSelect }: { onSelect: (mode: "create" | "import") => void }) {
  return (
    <div className="flex flex-col h-full items-center justify-center p-6 bg-slate-50 text-slate-900 text-center">
      <div className="w-16 h-16 bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center shadow-lg mb-6">
        <span className="text-white font-black text-3xl">A</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Welcome to Acorus</h1>
      <p className="text-sm text-slate-500 mb-10 px-4">
        Your self-custody Web3 wallet for seamless interaction with dApps across EVM, Solana, and Tron.
      </p>

      <div className="flex flex-col w-full gap-4">
        <button 
          onClick={() => onSelect("create")}
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl hover:border-violet-300 hover:shadow-md hover:-translate-y-0.5 transition-all w-full text-left group"
        >
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl group-hover:bg-violet-100 transition-colors">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900">Create new wallet</span>
            <span className="text-xs text-slate-500">I don't have a seed phrase</span>
          </div>
        </button>

        <button 
          onClick={() => onSelect("import")}
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl hover:border-fuchsia-300 hover:shadow-md hover:-translate-y-0.5 transition-all w-full text-left group"
        >
          <div className="p-3 bg-fuchsia-50 text-fuchsia-600 rounded-xl group-hover:bg-fuchsia-100 transition-colors">
            <Import className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900">Import existing wallet</span>
            <span className="text-xs text-slate-500">I already have a seed phrase</span>
          </div>
        </button>
      </div>
    </div>
  );
}

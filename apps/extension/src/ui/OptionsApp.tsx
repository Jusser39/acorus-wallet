import React from "react";

export function OptionsApp() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <h1 className="text-2xl font-bold mb-4">Acorus Extension Settings</h1>
        <p className="text-slate-600 mb-8">Manage your wallet extension preferences here.</p>
        
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h2 className="font-semibold text-lg">General</h2>
            <p className="text-sm text-slate-500">Configure general settings.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from "react";
import { Menu, ChevronDown, Copy } from "lucide-react";
import { Dashboard } from "./screens/Dashboard";
import { Buy } from "./screens/Buy";
import { Swap } from "./screens/Swap";
import { Activity } from "./screens/Activity";
import { Send } from "./screens/Send";
import { Receive } from "./screens/Receive";
import { Settings } from "./screens/Settings";
import { Approval } from "./screens/Approval";
import { SignerUnlockApproval } from "./screens/SignerUnlockApproval";
import { WalletConnect } from "./screens/WalletConnect";
import { Welcome } from "./screens/Welcome";
import { CreateWallet } from "./screens/CreateWallet";
import { ImportWallet } from "./screens/ImportWallet";
import { Unlock } from "./screens/Unlock";
import { ConnectionApproval } from "./screens/ConnectionApproval";
import { getBackgroundState } from "./api";

import type {
  DappRequest,
  DappSessionProposal,
} from "@acorus/shared";
import type {
  BackgroundStateSnapshot,
  SignerUnlockIntent,
} from "../shared/protocol";

export function PopupApp() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [pendingRequest, setPendingRequest] = useState<DappRequest | null>(null);
  const [pendingProposal, setPendingProposal] = useState<DappSessionProposal | null>(null);
  const [pendingSignerUnlock, setPendingSignerUnlock] = useState<SignerUnlockIntent | null>(null);
  const [appState, setAppState] = useState<BackgroundStateSnapshot | null>(null);
  const [onboardingMode, setOnboardingMode] = useState<"create" | "import" | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const fetchState = useCallback(() => {
    void getBackgroundState().then((state) => {
      if (!state) {
        return;
      }

      setAppState(state);
      setPendingProposal(state.proposals?.[0] ?? null);
      setPendingRequest(state.pendingRequests?.[0] ?? null);
      setPendingSignerUnlock(state.signerUnlockQueue?.[0] ?? null);
    });
  }, []);

  useEffect(() => {
    fetchState();

    const handleStorageChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName === "local" && Object.keys(changes).some((key) => key.startsWith("acorus_"))) {
        fetchState();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChanged);

    const timer = window.setInterval(fetchState, 1_000);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChanged);
      window.clearInterval(timer);
    };
  }, [fetchState]);

  if (!appState) {
    return <div className="h-[600px] w-[375px] bg-slate-50 flex items-center justify-center text-slate-500 font-medium">Loading Acorus...</div>;
  }

  // Router logic based on Vault status
  if (!appState.extensionVaultStatus.hasVault) {
    if (onboardingMode === "create") {
      return (
        <div className="h-[600px] w-[375px] overflow-hidden">
          <CreateWallet onBack={() => setOnboardingMode(null)} onComplete={fetchState} />
        </div>
      );
    }
    if (onboardingMode === "import") {
      return (
        <div className="h-[600px] w-[375px] overflow-hidden">
          <ImportWallet onBack={() => setOnboardingMode(null)} onComplete={fetchState} />
        </div>
      );
    }
    return (
      <div className="h-[600px] w-[375px] overflow-hidden">
        <Welcome onSelect={setOnboardingMode} />
      </div>
    );
  }

  if (!appState.extensionVaultStatus.isUnlocked) {
    return (
      <div className="h-[600px] w-[375px] overflow-hidden">
        <Unlock onUnlock={fetchState} />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveTab} />;
      case "buy":
        return <Buy onBack={() => setActiveTab("dashboard")} />;
      case "swap":
        return <Swap onBack={() => setActiveTab("dashboard")} />;
      case "send":
        return <Send onBack={() => setActiveTab("dashboard")} />;
      case "receive":
        return <Receive onBack={() => setActiveTab("dashboard")} />;
      case "activity":
        return <Activity onBack={() => setActiveTab("dashboard")} />;
      case "walletconnect":
        return <WalletConnect onBack={() => setActiveTab("dashboard")} />;
      case "settings":
        return <Settings onBack={() => setActiveTab("dashboard")} />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  if (pendingProposal) {
    return (
      <div className="h-[600px] w-[375px] overflow-hidden">
        <ConnectionApproval 
          proposal={pendingProposal} 
          onComplete={() => {
            setPendingProposal(null);
            fetchState();
          }} 
        />
      </div>
    );
  }

  if (pendingSignerUnlock) {
    return (
      <div className="h-[600px] w-[375px] overflow-hidden">
        <SignerUnlockApproval
          intent={pendingSignerUnlock}
          onComplete={() => {
            setPendingSignerUnlock(null);
            fetchState();
          }}
        />
      </div>
    );
  }

  if (pendingRequest) {
    return (
      <div className="h-[600px] w-[375px] overflow-hidden">
        <Approval 
          request={pendingRequest} 
          onComplete={() => {
            setPendingRequest(null);
            fetchState();
          }} 
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] w-[375px] bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans relative transition-colors duration-300">
      <header className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 relative z-50 transition-colors duration-300">
        <div className="relative">
          <button 
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            className="flex items-center gap-1 font-bold text-lg hover:opacity-80 transition-opacity"
          >
            Account 1 <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showAccountMenu ? "rotate-180" : ""}`} />
          </button>
          
          {showAccountMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAccountMenu(false)} />
              <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-3 py-2 border-b border-slate-50 dark:border-slate-800 mb-1">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Accounts</div>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Account 1</span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowAccountMenu(false);
                    setActiveTab("settings");
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  Manage / Reset Wallet
                </button>
              </div>
            </>
          )}
        </div>
        <button className="p-2 -mr-2 rounded-full hover:bg-slate-100 transition-colors" onClick={() => setActiveTab("settings")}>
          <Menu className="w-6 h-6 text-slate-700" />
        </button>
      </header>
      
      {/* Address Bar */}
      <div className="px-4 pb-2 bg-white relative z-40">
        <div 
          onClick={() => {
            const addr = appState.extensionVaultStatus.profiles[0]?.account;
            if (addr) {
              navigator.clipboard.writeText(addr).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/80 rounded-full text-xs font-semibold text-slate-600 border border-slate-200/50 cursor-pointer hover:bg-slate-200 transition-colors"
        >
          {appState.extensionVaultStatus.profiles[0]?.account?.slice(0,6) || "0xEA52"}...{appState.extensionVaultStatus.profiles[0]?.account?.slice(-5) || "79b5f"}
          {copied ? <div className="w-3 h-3 ml-1 text-emerald-500 font-bold">✓</div> : <Copy className="w-3 h-3 ml-1 text-slate-400" />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <main className="h-full">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

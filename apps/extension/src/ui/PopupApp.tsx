import React, { useState } from "react";
import { Wallet, ArrowLeftRight, Send, Download, Settings, History, Link2 } from "lucide-react";
import { Dashboard } from "./screens/Dashboard";
import { Swap } from "./screens/Swap";
// import SendScreen from "./screens/Send";
// import ReceiveScreen from "./screens/Receive";
import { Activity } from "./screens/Activity";
import { Settings } from "./screens/Settings";
import { Approval } from "./screens/Approval";
import { WalletConnect } from "./screens/WalletConnect";
import { getBackgroundState } from "./api";
import type { DappRequest } from "../shared/protocol";

export function PopupApp() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [pendingRequest, setPendingRequest] = useState<DappRequest | null>(null);

  React.useEffect(() => {
    // Initial fetch
    getBackgroundState().then(state => {
      if (state && state.pendingRequests && state.pendingRequests.length > 0) {
        setPendingRequest(state.pendingRequests[0]);
      }
    });

    // Listen for incoming requests while popup is open
    const handleMessage = (message: any) => {
      if (message.kind === "acorus#stateChanged" && message.detail?.pendingRequests) {
        if (message.detail.pendingRequests.length > 0) {
          setPendingRequest(message.detail.pendingRequests[0]);
        } else {
          setPendingRequest(null);
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "swap":
        return <Swap />;
      case "activity":
        return <Activity />;
      case "walletconnect":
        return <WalletConnect />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  if (pendingRequest) {
    return (
      <div className="h-[600px] w-[375px] overflow-hidden">
        <Approval 
          request={pendingRequest} 
          onComplete={() => {
            setPendingRequest(null);
            // Re-fetch state to see if there are more requests
            getBackgroundState().then(state => {
              if (state && state.pendingRequests && state.pendingRequests.length > 0) {
                setPendingRequest(state.pendingRequests[0]);
              }
            });
          }} 
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] w-[375px] bg-slate-50 text-slate-900 overflow-hidden font-sans relative">
      <div className="flex-1 overflow-y-auto pb-16">
        <header className="flex items-center justify-between p-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <h1 className="font-bold text-lg tracking-tight">Acorus</h1>
          </div>
          <button className="p-2 rounded-full hover:bg-slate-100 transition-colors" onClick={() => setActiveTab("settings")}>
            <Settings className="w-5 h-5 text-slate-600" />
          </button>
        </header>

        <main>
          {renderContent()}
        </main>
      </div>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-100 flex items-center justify-around px-2 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
        <NavItem icon={<Wallet className="w-5 h-5" />} label="Wallet" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
        <NavItem icon={<ArrowLeftRight className="w-5 h-5" />} label="Swap" active={activeTab === "swap"} onClick={() => setActiveTab("swap")} />
        <NavItem icon={<Link2 className="w-5 h-5" />} label="Connect" active={activeTab === "walletconnect"} onClick={() => setActiveTab("walletconnect")} />
        <NavItem icon={<History className="w-5 h-5" />} label="Activity" active={activeTab === "activity"} onClick={() => setActiveTab("activity")} />
      </nav>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-16 h-12 gap-1 transition-colors ${active ? "text-violet-600" : "text-slate-400 hover:text-slate-600"}`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

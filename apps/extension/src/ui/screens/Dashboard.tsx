import React, { useEffect, useState } from "react";
import { DollarSign, ArrowLeftRight, Send, Download, ExternalLink, SlidersHorizontal, MoreVertical } from "lucide-react";
import { getExtensionHome } from "../api";
import type { ExtensionPortfolioSnapshot } from "../../background/extension-assets";

export function Dashboard({ onNavigate }: { onNavigate?: (screen: string) => void }) {
  const [home, setHome] = useState<ExtensionPortfolioSnapshot | null>(() => {
    try {
      const cached = localStorage.getItem("acorus_dashboard_cache");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [err, setErr] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("tokens");
  const [selectedChainId, setSelectedChainId] = useState<number | "all">("all");
  const [networkMenuOpen, setNetworkMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [slidersMenuOpen, setSlidersMenuOpen] = useState(false);
  const [sortByValue, setSortByValue] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const timeout = setTimeout(() => {
      if (isMounted && !home) setErr({ error: "UI Timeout: Background script took more than 30 seconds to respond. The public RPC nodes might be rate limiting us." });
    }, 30000);

    getExtensionHome().then((data: any) => {
      if (!isMounted) return;
      clearTimeout(timeout);
      if (data?.ok) {
        setHome(data.result);
        localStorage.setItem("acorus_dashboard_cache", JSON.stringify(data.result));
      } else if (!home) {
        setErr(data || { error: "Background script failed to respond or returned undefined." });
      }
    }).catch(e => {
      if (!isMounted) return;
      clearTimeout(timeout);
      if (!home) setErr(String(e));
    });

    return () => { isMounted = false; clearTimeout(timeout); };
  }, []);

  if (err) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <h3 className="text-red-500 font-bold">Error loading Dashboard</h3>
        <pre className="text-xs mt-4 bg-slate-100 dark:bg-slate-800 p-2 rounded w-full overflow-auto text-slate-800 dark:text-slate-200 break-words whitespace-pre-wrap">
          {JSON.stringify(err, null, 2)}
        </pre>
      </div>
    );
  }

  if (!home) {
    return (
      <div className="flex items-center justify-center h-full mt-20">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
          <div className="w-32 h-6 bg-slate-100 dark:bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  const totalValue = home.totalFiatValue ?? 0;
  
  const handleViewExplorer = () => {
    setMoreMenuOpen(false);
    // Find the first account address
    const profile = home.assets.length > 0 ? "0x" : ""; // Not direct access to profile, but we can assume address is known or use a generic link
    // Wait, we can get active account from home assets if it's there, but actually home doesn't have the address.
    // However we can just redirect to etherscan general.
    window.open(`https://etherscan.io/`, "_blank");
  };

  const displayAssets = [...home.assets]
    .filter(a => selectedChainId === "all" || a.chainId === selectedChainId)
    .sort((a, b) => {
      if (!sortByValue) return 0;
      return (b.fiatValue || 0) - (a.fiatValue || 0);
    });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 relative pb-8">
      {/* Big Balance */}
      <div className="px-4 pt-6 pb-4">
        <h2 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {totalValue.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            +0,00 $ (+0,00 %)
          </span>
          <button className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
            Обзор <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="grid grid-cols-4 gap-3 px-4 mb-6">
        <ActionButton icon={<DollarSign className="w-5 h-5" />} label="Купить" onClick={() => onNavigate?.("buy")} />
        <ActionButton icon={<ArrowLeftRight className="w-5 h-5" />} label="Обмен" onClick={() => onNavigate?.("swap")} />
        <ActionButton icon={<Send className="w-5 h-5" />} label="Отправить" onClick={() => onNavigate?.("send")} />
        <ActionButton icon={<Download className="w-5 h-5" />} label="Получить" onClick={() => onNavigate?.("receive")} />
      </div>



      {/* Tabs */}
      <div className="px-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-6 overflow-x-auto no-scrollbar mb-4">
        <TabItem active={activeTab === "tokens"} label="Токены" onClick={() => setActiveTab("tokens")} />
        <TabItem active={activeTab === "predictions"} label="Прогнозы" onClick={() => setActiveTab("predictions")} />
        <TabItem active={activeTab === "perps"} label="Перпы" onClick={() => setActiveTab("perps")} />
        <TabItem active={activeTab === "defi"} label="DeFi" onClick={() => setActiveTab("defi")} />
        <TabItem active={activeTab === "nft"} label="NFT" onClick={() => setActiveTab("nft")} />
        <TabItem active={activeTab === "activity"} label="Деятельность" onClick={() => onNavigate?.("activity")} />
      </div>

      {activeTab === "tokens" && (
        <>
          {/* Filters Row */}
          <div className="px-4 flex items-center justify-between mb-2">
            <div className="relative">
              <button 
                onClick={() => setNetworkMenuOpen(!networkMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-medium hover:bg-slate-50 dark:bg-slate-900 outline-none cursor-pointer"
              >
                {selectedChainId === "all" ? "Все популярные сети" : home.networks.find(n => n.chainId === selectedChainId)?.name}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              
              {networkMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNetworkMenuOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-950 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50 max-h-64 overflow-y-auto">
                    <button 
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:bg-slate-900 text-sm font-medium text-slate-800 dark:text-slate-200"
                      onClick={() => { setSelectedChainId("all"); setNetworkMenuOpen(false); }}
                    >
                      Все популярные сети
                    </button>
                    {home.networks.map(n => (
                      <button 
                        key={n.chainId}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:bg-slate-900 text-sm font-medium text-slate-800 dark:text-slate-200"
                        onClick={() => { setSelectedChainId(n.chainId); setNetworkMenuOpen(false); }}
                      >
                        {n.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button 
                  onClick={() => setSlidersMenuOpen(!slidersMenuOpen)}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white outline-none"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
                {slidersMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setSlidersMenuOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-950 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50">
                      <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:bg-slate-900 text-sm font-medium text-slate-800 dark:text-slate-200" onClick={() => { setSlidersMenuOpen(false); onNavigate?.("settings"); }}>Manage tokens</button>
                      <button className="w-full text-left flex items-center justify-between px-4 py-2 hover:bg-slate-50 dark:bg-slate-900 text-sm font-medium text-slate-800 dark:text-slate-200" onClick={() => { setSortByValue(!sortByValue); setSlidersMenuOpen(false); }}>
                        Sort by value
                        {sortByValue && <span className="w-2 h-2 rounded-full bg-violet-500"></span>}
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="relative">
                <button 
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white outline-none"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {moreMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMoreMenuOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-950 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50">
                      <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:bg-slate-900 text-sm font-medium text-slate-800 dark:text-slate-200" onClick={() => { setMoreMenuOpen(false); onNavigate?.("settings"); }}>Settings</button>
                      <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:bg-slate-900 text-sm font-medium text-slate-800 dark:text-slate-200" onClick={handleViewExplorer}>View explorer</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Assets List */}
          <div className="flex flex-col px-2">
            {displayAssets.map((asset, index) => {
              const val = asset.fiatValue ? `${asset.fiatValue.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $` : "—";
              
              return (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:bg-slate-900 rounded-xl cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {asset.logoUrl ? (
                        <img src={asset.logoUrl} alt={asset.symbol} className="w-10 h-10 rounded-full object-cover shadow-inner bg-slate-50 dark:bg-slate-900" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                          {asset.symbol.substring(0, 2)}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white bg-slate-800 text-[8px] font-black text-white flex items-center justify-center">
                        {asset.family === "evm" ? "E" : asset.family === "solana" ? "S" : "B"}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white text-[15px]">{asset.name}</span>
                      </div>
                      <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">—</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-semibold text-slate-900 dark:text-white text-[15px]">{val}</span>
                    <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{asset.formatted ?? asset.balanceFormatted} {asset.symbol}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === "predictions" && <PredictionsTab />}
      {activeTab === "defi" && <DefiTab />}
      {activeTab === "perps" && <PerpsTab />}
      {activeTab === "nft" && <NftTab />}
    </div>
  );
}

function DefiTab() {
  return (
    <div className="flex flex-col px-4 gap-4 pb-10 items-center justify-center text-center mt-10">
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-2">
        <ArrowLeftRight className="w-8 h-8" />
      </div>
      <h3 className="font-bold text-slate-900 dark:text-white text-lg">No Active Positions</h3>
      <p className="text-slate-500 dark:text-slate-400 font-medium text-sm px-6">Explore DeFi protocols and earn yield on your assets across multiple chains.</p>
      <button className="mt-4 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-colors">
        Explore Opportunities
      </button>
    </div>
  );
}

function PerpsTab() {
  return (
    <div className="flex flex-col px-4 gap-4 pb-10 items-center justify-center text-center mt-10">
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-2">
        <TrendingUp className="w-8 h-8" />
      </div>
      <h3 className="font-bold text-slate-900 dark:text-white text-lg">Start Trading Perps</h3>
      <p className="text-slate-500 dark:text-slate-400 font-medium text-sm px-6">Trade with up to 50x leverage directly from your wallet with zero gas fees on L2s.</p>
      <button className="mt-4 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-colors">
        Deposit Collateral
      </button>
    </div>
  );
}

function NftTab() {
  return (
    <div className="flex flex-col px-4 gap-4 pb-10 items-center justify-center text-center mt-10">
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-2">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
      </div>
      <h3 className="font-bold text-slate-900 dark:text-white text-lg">No NFTs Found</h3>
      <p className="text-slate-500 dark:text-slate-400 font-medium text-sm px-6">Your NFT collection is currently empty. Purchase or mint NFTs to see them here.</p>
    </div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-2">
      <div className="w-[60px] h-[60px] bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-800 dark:text-slate-200 hover:bg-slate-200 transition-colors">
        {icon}
      </div>
      <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200">{label}</span>
    </button>
  );
}

function TabItem({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className={`pb-3 border-b-2 text-[15px] font-semibold whitespace-nowrap transition-colors ${active ? "border-slate-900 text-slate-900 dark:text-white" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}
    >
      {label}
    </button>
  );
}

// Prediction Markets Tab Component
import { TrendingUp, Users } from "lucide-react";

const MOCK_PREDICTIONS = [
  {
    id: 1,
    title: "Will Bitcoin reach $100k by 2026?",
    volume: "$24.5M",
    yesOdds: 68,
    noOdds: 32,
    image: "https://cryptologos.cc/logos/bitcoin-btc-logo.png"
  },
  {
    id: 2,
    title: "Ethereum Spot ETF flows > $10B in 2026?",
    volume: "$8.2M",
    yesOdds: 45,
    noOdds: 55,
    image: "https://cryptologos.cc/logos/ethereum-eth-logo.png"
  },
  {
    id: 3,
    title: "Who will win the US Presidential Election?",
    volume: "$142.1M",
    yesOdds: 51,
    noOdds: 49,
    image: "https://upload.wikimedia.org/wikipedia/en/thumb/a/a4/Flag_of_the_United_States.svg/800px-Flag_of_the_United_States.svg.png"
  }
];

function PredictionsTab() {
  const handleMarketClick = (title: string) => {
    window.open("https://polymarket.com/markets", "_blank");
  };

  return (
    <div className="flex flex-col px-4 gap-4 pb-10">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-slate-900 dark:text-white text-lg">Trending Markets</h3>
        <button onClick={() => handleMarketClick("all")} className="text-sm font-semibold text-blue-600 hover:text-blue-700">View All</button>
      </div>

      {MOCK_PREDICTIONS.map((market) => (
        <div key={market.id} onClick={() => handleMarketClick(market.title)} className="flex flex-col p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:border-blue-500 transition-colors cursor-pointer group">
          <div className="flex items-start gap-3">
            <img src={market.image} className="w-10 h-10 rounded-full object-cover border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900" alt="" />
            <div className="flex flex-col flex-1">
              <h4 className="font-bold text-slate-900 dark:text-white leading-tight mb-1 group-hover:text-blue-600 transition-colors">
                {market.title}
              </h4>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {market.volume} Vol.
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  2.4k Traders
                </div>
              </div>

              {/* Progress Bar & Odds */}
              <div className="flex flex-col gap-2 w-full">
                <div className="flex h-2.5 rounded-full overflow-hidden w-full">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${market.yesOdds}%` }}></div>
                  <div className="bg-rose-500 h-full transition-all" style={{ width: `${market.noOdds}%` }}></div>
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={(e) => { e.stopPropagation(); handleMarketClick(market.title); }} className="flex-1 py-1.5 px-3 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-500 rounded-lg text-sm font-bold text-center mr-2 transition-colors">
                    Yes {market.yesOdds}%
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleMarketClick(market.title); }} className="flex-1 py-1.5 px-3 bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-500 rounded-lg text-sm font-bold text-center ml-2 transition-colors">
                    No {market.noOdds}%
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}



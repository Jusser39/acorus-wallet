import React, { useEffect, useState } from "react";
import { DollarSign, ArrowLeftRight, Send, Download, ExternalLink, SlidersHorizontal, MoreVertical } from "lucide-react";
import { getExtensionHome } from "../api";
import type { ExtensionPortfolioSnapshot } from "../../background/extension-assets";

export function Dashboard({ onNavigate }: { onNavigate?: (screen: string) => void }) {
  const [home, setHome] = useState<ExtensionPortfolioSnapshot | null>(null);
  const [err, setErr] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("tokens");

  useEffect(() => {
    getExtensionHome().then((data: any) => {
      if (data?.ok) {
        setHome(data.result);
      } else {
        setErr(data);
      }
    }).catch(e => setErr(String(e)));
  }, []);

  if (err) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <h3 className="text-red-500 font-bold">Error loading Dashboard</h3>
        <pre className="text-xs mt-4 bg-slate-100 p-2 rounded w-full overflow-auto text-slate-800 break-words whitespace-pre-wrap">
          {JSON.stringify(err, null, 2)}
        </pre>
      </div>
    );
  }

  if (!home) {
    return (
      <div className="flex items-center justify-center h-full mt-20">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full"></div>
          <div className="w-32 h-6 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  const totalValue = home.totalFiatValue ?? 0;

  return (
    <div className="flex flex-col h-full bg-white relative pb-8">
      {/* Big Balance */}
      <div className="px-4 pt-6 pb-4">
        <h2 className="text-4xl font-semibold tracking-tight text-slate-900">
          {totalValue.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-medium text-slate-600">
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

      {/* Banner */}
      <div className="px-4 mb-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex relative overflow-hidden group cursor-pointer hover:border-slate-200 transition-colors">
          <div className="absolute top-2 right-2 text-slate-300 hover:text-slate-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xl">X</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-slate-800">Pre-IPO SpaceX</span>
              <span className="font-medium text-xs text-slate-500">Trade the index with the top 100 US tech and consumer stocks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 border-b border-slate-100 flex items-center gap-6 overflow-x-auto no-scrollbar mb-4">
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
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50">
              Все популярные сети
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div className="flex items-center gap-3">
              <button className="text-slate-600 hover:text-slate-900"><SlidersHorizontal className="w-4 h-4" /></button>
              <button className="text-slate-600 hover:text-slate-900"><MoreVertical className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Assets List */}
          <div className="flex flex-col px-2">
            {home.assets.map((asset, index) => {
              const val = asset.fiatValue ? `${asset.fiatValue.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $` : "—";
              
              return (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                        {asset.symbol.substring(0, 2)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white bg-slate-800 text-[8px] font-black text-white flex items-center justify-center">
                        {asset.family === "evm" ? "E" : asset.family === "solana" ? "S" : "B"}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-[15px]">{asset.name}</span>
                      </div>
                      <span className="text-[13px] font-medium text-slate-500 mt-0.5">—</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-semibold text-slate-900 text-[15px]">{val}</span>
                    <span className="text-[13px] font-medium text-slate-500 mt-0.5">{asset.formatted} {asset.symbol}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === "predictions" && (
        <PredictionsTab />
      )}
    </div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-2">
      <div className="w-[60px] h-[60px] bg-slate-100 rounded-2xl flex items-center justify-center text-slate-800 hover:bg-slate-200 transition-colors">
        {icon}
      </div>
      <span className="text-[12px] font-medium text-slate-800">{label}</span>
    </button>
  );
}

function TabItem({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className={`pb-3 border-b-2 text-[15px] font-semibold whitespace-nowrap transition-colors ${active ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
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
  return (
    <div className="flex flex-col px-4 gap-4 pb-10">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-slate-900 text-lg">Trending Markets</h3>
        <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">View All</button>
      </div>

      {MOCK_PREDICTIONS.map((market) => (
        <div key={market.id} className="flex flex-col p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-blue-500 transition-colors cursor-pointer group">
          <div className="flex items-start gap-3">
            <img src={market.image} className="w-10 h-10 rounded-full object-cover border border-slate-100 bg-slate-50" alt="" />
            <div className="flex flex-col flex-1">
              <h4 className="font-bold text-slate-900 leading-tight mb-1 group-hover:text-blue-600 transition-colors">
                {market.title}
              </h4>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 mb-3">
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
                  <div className="bg-emerald-500 h-full" style={{ width: `${market.yesOdds}%` }}></div>
                  <div className="bg-rose-500 h-full" style={{ width: `${market.noOdds}%` }}></div>
                </div>
                <div className="flex items-center justify-between">
                  <button className="flex-1 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold text-center mr-2 transition-colors">
                    Yes {market.yesOdds}%
                  </button>
                  <button className="flex-1 py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-sm font-bold text-center ml-2 transition-colors">
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

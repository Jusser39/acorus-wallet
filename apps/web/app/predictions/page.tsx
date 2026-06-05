"use client";

import { useState } from "react";
import { GlassCard } from "@/components/glass-card";
import { TrendingUp, Users, Activity, BarChart3, AlertCircle } from "lucide-react";

const MOCK_PREDICTIONS = [
  {
    id: 1,
    title: "Will Bitcoin reach $100k by 2026?",
    category: "Crypto",
    volume: "$24.5M",
    traders: "12.4k",
    yesOdds: 68,
    noOdds: 32,
    image: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
    endDate: "Dec 31, 2026"
  },
  {
    id: 2,
    title: "Ethereum Spot ETF flows > $10B in 2026?",
    category: "Crypto",
    volume: "$8.2M",
    traders: "4.1k",
    yesOdds: 45,
    noOdds: 55,
    image: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    endDate: "Dec 31, 2026"
  },
  {
    id: 3,
    title: "Who will win the US Presidential Election?",
    category: "Politics",
    volume: "$142.1M",
    traders: "89.2k",
    yesOdds: 51,
    noOdds: 49,
    image: "https://upload.wikimedia.org/wikipedia/en/thumb/a/a4/Flag_of_the_United_States.svg/800px-Flag_of_the_United_States.svg.png",
    endDate: "Nov 5, 2024"
  },
  {
    id: 4,
    title: "Will OpenAI release GPT-5 in 2026?",
    category: "AI",
    volume: "$12.8M",
    traders: "6.5k",
    yesOdds: 82,
    noOdds: 18,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/1024px-ChatGPT_logo.svg.png",
    endDate: "Dec 31, 2026"
  }
];

export default function PredictionsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  
  const categories = ["All", "Crypto", "Politics", "AI", "Sports"];
  const filteredMarkets = activeCategory === "All" ? MOCK_PREDICTIONS : MOCK_PREDICTIONS.filter(m => m.category === activeCategory);

  return (
    <main className="magic-shell relative overflow-hidden px-4 py-10 min-h-screen">
      {/* Background Blobs */}
      <div className="bg-blobs">
        <div className="blob blob-purple opacity-70" style={{ left: "20%", top: "10%", width: "400px", height: "400px" }}></div>
        <div className="blob blob-blue opacity-50" style={{ right: "10%", top: "30%", width: "500px", height: "500px" }}></div>
      </div>

      <section className="relative z-10 mx-auto w-full max-w-5xl space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/60 p-8 rounded-3xl border border-white/40 shadow-xl backdrop-blur-3xl">
          <div>
            <h1 className="text-4xl font-black glow-text-content mb-2 flex items-center gap-3">
              Prediction Markets <BarChart3 className="w-8 h-8 text-fuchsia-600" />
            </h1>
            <p className="text-lg text-slate-600 font-medium">
              Trade on the outcome of future events. Buy Yes or No shares to build your portfolio.
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-4 min-w-[120px] shadow-sm">
              <span className="text-sm font-semibold text-slate-500 mb-1">Total Volume</span>
              <span className="text-2xl font-black text-slate-900">$187.6M</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-4 min-w-[120px] shadow-sm">
              <span className="text-sm font-semibold text-slate-500 mb-1">Active Markets</span>
              <span className="text-2xl font-black text-slate-900">1,240</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full font-bold transition-all whitespace-nowrap ${
                activeCategory === cat 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "bg-white/80 text-slate-600 hover:bg-white border border-slate-200 backdrop-blur-md"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Markets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {filteredMarkets.map((market) => (
            <GlassCard key={market.id} glow className="p-6 flex flex-col group cursor-pointer hover:-translate-y-1 transition-transform duration-300">
              <div className="flex items-start gap-4 mb-4">
                <img src={market.image} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm bg-white" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                      {market.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md text-slate-600">
                      <TrendingUp className="w-4 h-4" /> {market.volume}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> {market.traders} Traders
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex h-3 rounded-full overflow-hidden w-full mb-4 bg-slate-100">
                <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${market.yesOdds}%` }}></div>
                <div className="bg-rose-500 h-full transition-all duration-1000" style={{ width: `${market.noOdds}%` }}></div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 mt-auto">
                <button 
                  className="flex-1 py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold transition-colors flex justify-between items-center"
                  onClick={(e) => { e.stopPropagation(); alert(`Buying YES on: ${market.title}`) }}
                >
                  <span>Buy Yes</span>
                  <span className="text-lg">{market.yesOdds}¢</span>
                </button>
                <button 
                  className="flex-1 py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold transition-colors flex justify-between items-center"
                  onClick={(e) => { e.stopPropagation(); alert(`Buying NO on: ${market.title}`) }}
                >
                  <span>Buy No</span>
                  <span className="text-lg">{market.noOdds}¢</span>
                </button>
              </div>
              
              <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-400 border-t border-slate-100 pt-3">
                <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Live</span>
                <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Closes {market.endDate}</span>
              </div>
            </GlassCard>
          ))}
        </div>

      </section>
    </main>
  );
}

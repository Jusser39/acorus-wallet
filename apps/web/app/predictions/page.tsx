"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/glass-card";
import { TrendingUp, Users, Activity, BarChart3, AlertCircle, X, ShieldCheck, Info } from "lucide-react";
import { requestAcorusExtension, requestAcorusProviderDiscovery } from "@/lib/extension-bridge";

type Bet = {
  id: string;
  marketId: number;
  marketTitle: string;
  choice: "YES" | "NO";
  amount: number;
  odds: number;
  placedAt: string;
};

type Market = {
  id: number;
  title: string;
  category: string;
  volume: string;
  traders: string;
  yesOdds: number;
  noOdds: number;
  image: string;
  endDate: string;
};

const MOCK_PREDICTIONS: Market[] = [
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
  },
  {
    id: 5,
    title: "Will the FED cut interest rates in Q3 2026?",
    category: "Politics",
    volume: "$5.4M",
    traders: "2.1k",
    yesOdds: 30,
    noOdds: 70,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Seal_of_the_United_States_Federal_Reserve_System.svg/1024px-Seal_of_the_United_States_Federal_Reserve_System.svg.png",
    endDate: "Sep 30, 2026"
  },
  {
    id: 6,
    title: "Solana to reach $500 in 2026?",
    category: "Crypto",
    volume: "$44.1M",
    traders: "35.2k",
    yesOdds: 74,
    noOdds: 26,
    image: "https://cryptologos.cc/logos/solana-sol-logo.png",
    endDate: "Dec 31, 2026"
  },
  {
    id: 7,
    title: "Will Real Madrid win the Champions League 2026?",
    category: "Sports",
    volume: "$19.3M",
    traders: "18.5k",
    yesOdds: 41,
    noOdds: 59,
    image: "https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/800px-Real_Madrid_CF.svg.png",
    endDate: "Jun 1, 2026"
  },
  {
    id: 8,
    title: "Will Claude 4 be released before 2026?",
    category: "AI",
    volume: "$3.2M",
    traders: "1.2k",
    yesOdds: 90,
    noOdds: 10,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Anthropic_logo.svg/1024px-Anthropic_logo.svg.png",
    endDate: "Dec 31, 2025"
  },
  {
    id: 9,
    title: "Will US Inflation fall below 2% in 2025?",
    category: "Economy",
    volume: "$18.4M",
    traders: "9.2k",
    yesOdds: 25,
    noOdds: 75,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Seal_of_the_United_States_Federal_Reserve_System.svg/1024px-Seal_of_the_United_States_Federal_Reserve_System.svg.png",
    endDate: "Dec 31, 2025"
  },
  {
    id: 10,
    title: "Will Gold reach $3,000 per ounce?",
    category: "Economy",
    volume: "$11.1M",
    traders: "4.8k",
    yesOdds: 60,
    noOdds: 40,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Gold_bullion_bars.jpg/800px-Gold_bullion_bars.jpg",
    endDate: "Dec 31, 2025"
  },
  {
    id: 11,
    title: "Will GTA VI be released in Q3 2025?",
    category: "Entertainment",
    volume: "$54.2M",
    traders: "45.1k",
    yesOdds: 85,
    noOdds: 15,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Rockstar_Games_Logo.svg/1024px-Rockstar_Games_Logo.svg.png",
    endDate: "Sep 30, 2025"
  },
  {
    id: 12,
    title: "Who will win the Oscar for Best Picture 2025?",
    category: "Entertainment",
    volume: "$8.7M",
    traders: "3.5k",
    yesOdds: 45,
    noOdds: 55,
    image: "https://upload.wikimedia.org/wikipedia/en/thumb/e/ef/Academy_Award_trophy.jpg/640px-Academy_Award_trophy.jpg",
    endDate: "Mar 10, 2025"
  },
  {
    id: 13,
    title: "Will SpaceX land humans on Mars by 2029?",
    category: "Science",
    volume: "$4.5M",
    traders: "2.1k",
    yesOdds: 20,
    noOdds: 80,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/SpaceX-Logo-Xonly.svg/1024px-SpaceX-Logo-Xonly.svg.png",
    endDate: "Dec 31, 2029"
  },
  {
    id: 14,
    title: "Will a room-temperature superconductor be proven?",
    category: "Science",
    volume: "$1.2M",
    traders: "800",
    yesOdds: 10,
    noOdds: 90,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Meissner_effect_p1390048.jpg/800px-Meissner_effect_p1390048.jpg",
    endDate: "Dec 31, 2026"
  }
];

export default function PredictionsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [betChoice, setBetChoice] = useState<"YES" | "NO" | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [isBetting, setIsBetting] = useState(false);
  const [myBets, setMyBets] = useState<Bet[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("acorus_my_bets");
    if (stored) {
      try { setMyBets(JSON.parse(stored)); } catch (e) {}
    }
  }, []);
  
  const categories = ["All", "My Bets", "Crypto", "Politics", "AI", "Sports", "Economy", "Entertainment", "Science"];
  const filteredMarkets = activeCategory === "All" ? MOCK_PREDICTIONS : MOCK_PREDICTIONS.filter(m => m.category === activeCategory);

  const openBetModal = (market: Market, choice: "YES" | "NO") => {
    setSelectedMarket(market);
    setBetChoice(choice);
    setBetAmount("");
    setBetModalOpen(true);
  };

  const handleConfirmBet = async () => {
    if (!betAmount || Number(betAmount) <= 0 || !selectedMarket || !betChoice) return;
    
    setIsBetting(true);
    requestAcorusProviderDiscovery();
    
    try {
      // Prompt wallet connection if not connected
      const accounts = await requestAcorusExtension<string[]>("acorus_requestAccounts", [{ family: "evm" }]);
      const account = Array.isArray(accounts) ? accounts[0] : null;
      
      if (!account) throw new Error("Wallet not connected");

      // Send mock transaction to prediction contract
      await requestAcorusExtension("acorus_sendTransaction", [{
        from: account,
        to: "0x8E304892cfa76e8a8D293043d83492ffF9859f77", // Mock contract
        value: "0x0",
        data: "0x",
      }]);

      const newBet: Bet = {
        id: Math.random().toString(36).substring(7),
        marketId: selectedMarket.id,
        marketTitle: selectedMarket.title,
        choice: betChoice,
        amount: Number(betAmount),
        odds: betChoice === "YES" ? selectedMarket.yesOdds : selectedMarket.noOdds,
        placedAt: new Date().toLocaleDateString()
      };
      const updatedBets = [newBet, ...myBets];
      setMyBets(updatedBets);
      localStorage.setItem("acorus_my_bets", JSON.stringify(updatedBets));

      alert(`Successfully placed $${betAmount} on ${betChoice} for "${selectedMarket.title}"`);
      setBetModalOpen(false);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to place bet. Please unlock your wallet.");
    } finally {
      setIsBetting(false);
    }
  };

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
              <span className="text-2xl font-black text-slate-900">$255.4M</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-4 min-w-[120px] shadow-sm">
              <span className="text-sm font-semibold text-slate-500 mb-1">Active Markets</span>
              <span className="text-2xl font-black text-slate-900">1,244</span>
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
          {activeCategory === "My Bets" ? (
            myBets.length === 0 ? (
              <div className="col-span-1 md:col-span-2 text-center py-20 bg-white/40 rounded-3xl border border-white/50 backdrop-blur-md">
                <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-slate-700 mb-2">No Active Bets</h3>
                <p className="text-slate-500 font-medium">You haven't placed any predictions yet.</p>
              </div>
            ) : (
              myBets.map((bet) => (
                <GlassCard key={bet.id} glow className="p-6 flex flex-col transition-transform duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold mb-2 ${bet.choice === "YES" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {bet.choice} at {bet.odds}¢
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 leading-snug">
                        {bet.marketTitle}
                      </h3>
                    </div>
                  </div>
                  <div className="mt-auto bg-slate-50 rounded-xl p-4 flex items-center justify-between border border-slate-100">
                    <div>
                      <span className="block text-xs font-semibold text-slate-400 mb-1">Bet Amount</span>
                      <span className="text-lg font-black text-slate-800">${bet.amount.toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-semibold text-slate-400 mb-1">Potential Return</span>
                      <span className="text-lg font-black text-emerald-600">${(bet.amount * 100 / bet.odds).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="mt-4 text-xs font-semibold text-slate-400">
                    Placed on {bet.placedAt}
                  </div>
                </GlassCard>
              ))
            )
          ) : (
            filteredMarkets.map((market) => (
              <GlassCard key={market.id} glow className="p-6 flex flex-col group transition-transform duration-300">
                <div className="flex items-start gap-4 mb-4">
                  <img src={market.image} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm bg-white" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors cursor-pointer">
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
                <div className="flex h-3 rounded-full overflow-hidden w-full mb-4 bg-slate-100 cursor-pointer">
                  <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${market.yesOdds}%` }}></div>
                  <div className="bg-rose-500 h-full transition-all duration-1000" style={{ width: `${market.noOdds}%` }}></div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 mt-auto">
                  <button 
                    className="flex-1 py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold transition-colors flex justify-between items-center group/btn"
                    onClick={(e) => { e.stopPropagation(); openBetModal(market, "YES"); }}
                  >
                    <span className="group-hover/btn:scale-105 transition-transform">Buy Yes</span>
                    <span className="text-lg">{market.yesOdds}¢</span>
                  </button>
                  <button 
                    className="flex-1 py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold transition-colors flex justify-between items-center group/btn"
                    onClick={(e) => { e.stopPropagation(); openBetModal(market, "NO"); }}
                  >
                    <span className="group-hover/btn:scale-105 transition-transform">Buy No</span>
                    <span className="text-lg">{market.noOdds}¢</span>
                  </button>
                </div>
                
                <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-400 border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Live</span>
                  <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Closes {market.endDate}</span>
                </div>
              </GlassCard>
            ))
          )}
        </div>

      </section>

      {/* Betting Modal */}
      {betModalOpen && selectedMarket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setBetModalOpen(false)}></div>
          <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">Place Bet</h2>
              <button onClick={() => setBetModalOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <img src={selectedMarket.image} alt="" className="w-10 h-10 rounded-full border border-slate-100 bg-white" />
                <div className="font-bold text-slate-800 leading-tight">
                  {selectedMarket.title}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
                <button 
                  onClick={() => setBetChoice("YES")}
                  className={`flex-1 py-2 font-bold rounded-lg transition-all ${betChoice === "YES" ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200/50"}`}
                >
                  YES ({selectedMarket.yesOdds}¢)
                </button>
                <button 
                  onClick={() => setBetChoice("NO")}
                  className={`flex-1 py-2 font-bold rounded-lg transition-all ${betChoice === "NO" ? "bg-rose-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200/50"}`}
                >
                  NO ({selectedMarket.noOdds}¢)
                </button>
              </div>

              <div className="mb-6">
                <label className="text-sm font-semibold text-slate-500 mb-2 block">Amount (USDC)</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                  <span className="text-xl font-bold text-slate-400 mr-2">$</span>
                  <input 
                    type="number" 
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-transparent w-full outline-none text-2xl font-black text-slate-800 placeholder:text-slate-300"
                    autoFocus
                  />
                  <button onClick={() => setBetAmount("100")} className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full hover:bg-blue-200 transition-colors ml-2">MAX</button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-100 flex flex-col gap-2 text-sm">
                <div className="flex justify-between font-semibold text-slate-500">
                  <span>Potential Return</span>
                  <span className="text-slate-800">${(Number(betAmount) * 100 / (betChoice === "YES" ? selectedMarket.yesOdds : selectedMarket.noOdds)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-500">
                  <span>Network Fee</span>
                  <span className="text-slate-800">~$0.05</span>
                </div>
              </div>

              <button 
                onClick={handleConfirmBet}
                disabled={!betAmount || Number(betAmount) <= 0 || isBetting}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {isBetting ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    Confirm Bet
                  </>
                )}
              </button>
              
              <div className="flex items-center justify-center gap-1.5 mt-4 text-xs font-semibold text-slate-400">
                <Info className="w-4 h-4 text-slate-400" />
                Powered by Acorus Smart Contracts
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

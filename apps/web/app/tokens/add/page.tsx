"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";
import { createUserToken } from "@/lib/api";
import { EVM_CHAINS } from "@acorus/shared";
import { isAddress } from "viem";

export default function AddTokenPage() {
  const router = useRouter();
  const activeProfile = useActiveProfile();
  const userId = useWalletStore((state) => state.userId);
  const selectedChainId = useWalletStore((state) => state.selectedChainId);

  const [chainId, setChainId] = useState(selectedChainId);
  const [tokenAddress, setTokenAddress] = useState("");
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [decimals, setDecimals] = useState("18");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !activeProfile) return;

    if (!isAddress(tokenAddress)) {
      setError("Invalid token address.");
      return;
    }
    if (!symbol.trim()) {
      setError("Symbol is required.");
      return;
    }
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    const dec = parseInt(decimals, 10);
    if (isNaN(dec) || dec < 0 || dec > 36) {
      setError("Decimals must be 0–36.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createUserToken({
        userId,
        walletProfileId: activeProfile.id,
        chainId,
        tokenAddress,
        symbol: symbol.trim().toUpperCase(),
        name: name.trim(),
        decimals: dec,
        isCustom: true,
      });
      router.push("/wallet");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add token.");
    } finally {
      setLoading(false);
    }
  }

  if (!activeProfile || !userId) {
    return (
      <section className="page">
        <div className="panel space-y-3">
          <p className="text-sm text-slate-400">No active wallet. Please create or unlock a wallet first.</p>
          <Link href="/" className="button-primary inline-flex">Go home</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/wallet" className="text-sm text-slate-400 hover:text-white">← Wallet</Link>
        <span className="text-slate-600">/</span>
        <span className="text-sm text-slate-300">Add token</span>
      </div>

      <div className="panel space-y-6">
        <h1 className="text-2xl font-semibold">Add custom token</h1>
        <p className="text-sm text-slate-400">
          Add any ERC-20 token by contract address. The token will appear in your asset list.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Network</span>
            <select value={chainId} onChange={(e) => setChainId(Number(e.target.value))}>
              {EVM_CHAINS.map((c) => (
                <option key={c.chainId} value={c.chainId}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Contract address</span>
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value.trim())}
              placeholder="0x..."
              className="w-full"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Symbol</span>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="USDT"
              maxLength={24}
              className="w-full"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tether USD"
              maxLength={120}
              className="w-full"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Decimals</span>
            <input
              type="number"
              value={decimals}
              onChange={(e) => setDecimals(e.target.value)}
              min={0}
              max={36}
              className="w-full"
              required
            />
          </label>

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <div className="flex gap-3">
            <button type="submit" className="button-primary flex-1" disabled={loading}>
              {loading ? "Adding…" : "Add token"}
            </button>
            <Link href="/wallet" className="button-secondary flex-1 text-center">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}

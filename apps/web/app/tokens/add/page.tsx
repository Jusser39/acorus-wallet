"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";
import { createUserToken, discoverToken, type TokenDiscoveryResult } from "@/lib/api";
import { EVM_CHAINS } from "@acorus/shared";
import { isAddress } from "viem";
import { readErc20TokenMetadata } from "@acorus/wallet-core";

export default function AddTokenPage() {
  const router = useRouter();
  const activeProfile = useActiveProfile();
  const userId = useWalletStore((state) => state.userId);
  const selectedChainId = useWalletStore((state) => state.selectedChainId);

  const [chainId, setChainId] = useState(selectedChainId);
  const [tokenAddress, setTokenAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TokenDiscoveryResult | null>(null);

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !activeProfile) return;

    if (!isAddress(tokenAddress)) {
      setError("Invalid token address.");
      return;
    }

    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      // First, try to read on-chain metadata
      const onchainMeta = await readErc20TokenMetadata(
        tokenAddress as `0x${string}`,
        chainId,
        process.env,
      );

      // Then, try to discover market data (optional – null on failure is fine)
      let discovery: TokenDiscoveryResult | null = null;
      try {
        discovery = await discoverToken(chainId, tokenAddress);
      } catch {
        // Market discovery is optional; proceed with on-chain data only.
      }

      setPreview({
        chainId,
        tokenAddress,
        symbol: discovery?.symbol ?? onchainMeta.symbol,
        name: discovery?.name ?? onchainMeta.name,
        decimals: discovery?.decimals ?? onchainMeta.decimals,
        liquidityUsd: discovery?.liquidityUsd ?? null,
        volume24hUsd: discovery?.volume24hUsd ?? null,
        marketCapUsd: discovery?.marketCapUsd ?? null,
        fdvUsd: discovery?.fdvUsd ?? null,
        pairUrl: discovery?.pairUrl ?? null,
        riskLevel: discovery?.riskLevel ?? "unknown",
        riskFlags: discovery?.riskFlags ?? [],
        sourceStatus: discovery?.sourceStatus ?? "mock",
        providerId: discovery?.providerId ?? "onchain",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read token metadata.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToken() {
    if (!userId || !activeProfile || !preview) return;

    setLoading(true);
    setError(null);

    try {
      await createUserToken({
        userId,
        walletProfileId: activeProfile.id,
        chainId: preview.chainId,
        tokenAddress: preview.tokenAddress,
        symbol: preview.symbol,
        name: preview.name,
        decimals: preview.decimals,
        isCustom: true,
        sourceStatus: preview.sourceStatus,
        liquidityUsd: preview.liquidityUsd,
        volume24hUsd: preview.volume24hUsd,
        marketCapUsd: preview.marketCapUsd,
        fdvUsd: preview.fdvUsd,
        pairUrl: preview.pairUrl,
        riskLevel: preview.riskLevel,
        riskFlagsJson: JSON.stringify(preview.riskFlags),
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
          Add any ERC-20 token by contract address. We'll fetch token details and market data automatically.
        </p>

        {!preview ? (
          <form onSubmit={(e) => void handlePreview(e)} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">Network</span>
              <select
                value={chainId}
                onChange={(e) => setChainId(Number(e.target.value))}
                className="w-full"
              >
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

            {error && <p className="text-sm text-rose-300">{error}</p>}

            <div className="flex gap-3">
              <button type="submit" className="button-primary flex-1" disabled={loading}>
                {loading ? "Loading…" : "Preview token"}
              </button>
              <Link href="/wallet" className="button-secondary flex-1 text-center">
                Cancel
              </Link>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="panel bg-slate-800/50 space-y-4">
              <h2 className="text-lg font-medium">Token Preview</h2>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Symbol</p>
                  <p className="font-medium">{preview.symbol}</p>
                </div>
                <div>
                  <p className="text-slate-400">Name</p>
                  <p className="font-medium">{preview.name}</p>
                </div>
                <div>
                  <p className="text-slate-400">Decimals</p>
                  <p className="font-medium">{preview.decimals}</p>
                </div>
                <div>
                  <p className="text-slate-400">Risk Level</p>
                  <p className={`font-medium ${
                    preview.riskLevel === "low" ? "text-green-400" :
                    preview.riskLevel === "medium" ? "text-yellow-400" :
                    preview.riskLevel === "high" ? "text-rose-400" :
                    "text-slate-400"
                  }`}>
                    {preview.riskLevel.toUpperCase()}
                  </p>
                </div>
              </div>

              {preview.liquidityUsd && (
                <div className="text-sm">
                  <p className="text-slate-400">Liquidity</p>
                  <p className="font-medium">${preview.liquidityUsd.toLocaleString()}</p>
                </div>
              )}

              {preview.volume24hUsd && (
                <div className="text-sm">
                  <p className="text-slate-400">24h Volume</p>
                  <p className="font-medium">${preview.volume24hUsd.toLocaleString()}</p>
                </div>
              )}

              {preview.marketCapUsd && (
                <div className="text-sm">
                  <p className="text-slate-400">Market Cap</p>
                  <p className="font-medium">${preview.marketCapUsd.toLocaleString()}</p>
                </div>
              )}

              {preview.pairUrl && (
                <div className="text-sm">
                  <a
                    href={preview.pairUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline"
                  >
                    View on {preview.providerId}
                  </a>
                </div>
              )}

              {preview.riskFlags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-400">Risk Flags:</p>
                  <div className="flex flex-wrap gap-2">
                    {preview.riskFlags.map((flag) => (
                      <span
                        key={flag}
                        className="px-2 py-1 text-xs rounded bg-slate-700 text-slate-300"
                      >
                        {flag.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {(preview.riskLevel === "medium" || preview.riskLevel === "high") && (
              <div className="panel bg-rose-900/20 border border-rose-700/30 space-y-2">
                <h3 className="text-sm font-medium text-rose-300">⚠️ Warning</h3>
                <p className="text-sm text-slate-300">
                  This token has been flagged with {preview.riskLevel} risk. Please verify the token contract
                  and be cautious when trading.
                </p>
              </div>
            )}

            {error && <p className="text-sm text-rose-300">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => void handleAddToken()}
                className="button-primary flex-1"
                disabled={loading}
              >
                {loading ? "Adding…" : "Add token"}
              </button>
              <button
                onClick={() => { setPreview(null); setError(null); }}
                className="button-secondary flex-1"
                disabled={loading}
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

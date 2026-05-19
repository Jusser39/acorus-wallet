"use client";

import { useEffect, useMemo, useState } from "react";
import { EVM_CHAINS, getCuratedTokens, type AssetBalance, type EvmSwapQuoteResponse } from "@acorus/shared";
import { getEvmSwapQuote, getEvmSwapStatus, type EvmSwapStatus } from "@/lib/api";
import { hasAcorusExtension, requestExtensionSwap } from "@/lib/extension-bridge";

type TokenOption = {
  value: string;
  symbol: string;
  name: string;
  decimals: number;
  balanceFormatted?: string | null;
};

export function SwapComposer(props: {
  portfolioAssets?: AssetBalance[];
  userAddress?: string | null;
}) {
  const [status, setStatus] = useState<EvmSwapStatus | null>(null);
  const [chainId, setChainId] = useState(1);
  const [sellToken, setSellToken] = useState("native");
  const [buyToken, setBuyToken] = useState("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
  const [sellAmount, setSellAmount] = useState("");
  const [slippageBps, setSlippageBps] = useState(50);
  const [quote, setQuote] = useState<EvmSwapQuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [extensionResult, setExtensionResult] = useState<string | null>(null);
  const extensionDetected = typeof window !== "undefined" && hasAcorusExtension();

  const tokens = useMemo(
    () => buildEvmTokenOptions(chainId, props.portfolioAssets),
    [chainId, props.portfolioAssets],
  );
  const selectedSellToken = tokens.find((token) => token.value === sellToken) ?? tokens[0]!;

  useEffect(() => {
    void getEvmSwapStatus()
      .then(setStatus)
      .catch(() => setStatus({
        ok: true,
        provider: "0x",
        approvalModel: "allowance_holder",
        configured: false,
        enabled: false,
        supportedChains: [],
        apiBase: "",
        version: "v2",
      }));
  }, []);

  useEffect(() => {
    const nextTokens = buildEvmTokenOptions(chainId, props.portfolioAssets);
    setSellToken(nextTokens[0]?.value ?? "native");
    setBuyToken(nextTokens[1]?.value ?? nextTokens[0]?.value ?? "native");
    setQuote(null);
    setError(null);
  }, [chainId, props.portfolioAssets]);

  async function handleQuote() {
    setLoading(true);
    setError(null);
    setQuote(null);
    setExtensionResult(null);

    try {
      if (!props.userAddress) {
        throw new Error("Connect Acorus extension before requesting a firm quote.");
      }

      const nextQuote = await getEvmSwapQuote({
        chainId,
        sellToken,
        buyToken,
        sellAmount,
        taker: props.userAddress,
        slippageBps,
      });

      setQuote(nextQuote);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch 0x quote.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExtensionSwap() {
    if (!quote) return;
    setExtensionResult(null);

    try {
      await requestExtensionSwap({
        provider: "0x",
        quoteId: quote.requestId,
        chainId: quote.chainId,
        from: quote.takerAddress,
        to: quote.to,
        data: quote.data,
        value: quote.value,
        gas: quote.gas,
        gasPrice: quote.gasPrice,
        expiresAt: quote.expiresAt,
        sellTokenSymbol: quote.sellToken.symbol,
        buyTokenSymbol: quote.buyToken.symbol,
        sellAmountRaw: quote.sellAmountRaw,
        buyAmountRaw: quote.buyAmountRaw,
        minBuyAmountRaw: quote.minBuyAmountRaw,
        slippageBps,
        priceImpact: quote.estimatedPriceImpact,
        routeLabel: quote.routeSummary.label,
      });
      setExtensionResult("Swap request queued in Acorus extension. Open the popup to approve or reject.");
    } catch (err) {
      setExtensionResult(err instanceof Error ? err.message : "Extension swap request failed.");
    }
  }

  const providerReady = Boolean(status?.configured && status.enabled);
  const highImpact = quote?.estimatedPriceImpact
    ? Number(quote.estimatedPriceImpact) > 0.05
    : false;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,640px)_minmax(320px,1fr)] xl:justify-center">
      <div className="light-card space-y-5 rounded-[2rem] p-4 sm:p-5">
        <div className="px-3 pt-3">
          <span className="section-kicker !border-slate-900/10 !bg-white/75 !text-slate-700">
            0x EVM swap
          </span>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            Swap with Acorus extension
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            0x quotes are fetched through the Acorus backend. Your wallet signs only after explicit extension approval.
          </p>
        </div>

        {!providerReady ? (
          <div className="mx-1 rounded-[1.5rem] border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-900">
            0x provider is not configured on the backend yet. Set `ZEROX_API_KEY` on the API server to enable live quotes.
          </div>
        ) : null}

        {!extensionDetected ? (
          <div className="mx-1 rounded-[1.5rem] border border-sky-400/30 bg-sky-400/10 p-4 text-sm text-sky-900">
            Acorus extension was not detected. Install or reload the extension to execute swaps.
          </div>
        ) : null}

        <div className="grid gap-2 rounded-[1.6rem] bg-white/60 p-2">
          <label className="space-y-2">
            <span className="px-2 text-sm font-medium text-slate-600">EVM network</span>
            <select className="light-field" value={chainId} onChange={(event) => setChainId(Number(event.target.value))}>
              {EVM_CHAINS.map((chain) => (
                <option key={chain.chainId} value={chain.chainId}>{chain.name}</option>
              ))}
            </select>
          </label>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="space-y-2">
              <span className="px-2 text-sm font-medium text-slate-600">Sell</span>
              <select className="light-field" value={sellToken} onChange={(event) => setSellToken(event.target.value)}>
                {tokens.map((token) => (
                  <option key={`sell-${token.value}`} value={token.value}>
                    {token.symbol} · {token.name}{token.balanceFormatted ? ` · ${token.balanceFormatted}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="px-2 text-sm font-medium text-slate-600">Buy</span>
              <select className="light-field" value={buyToken} onChange={(event) => setBuyToken(event.target.value)}>
                {tokens.map((token) => (
                  <option key={`buy-${token.value}`} value={token.value}>
                    {token.symbol} · {token.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_180px]">
            <label className="space-y-2">
              <span className="px-2 text-sm font-medium text-slate-600">Sell amount raw</span>
              <input
                className="light-field"
                inputMode="numeric"
                placeholder={`Raw ${selectedSellToken.symbol} amount`}
                value={sellAmount}
                onChange={(event) => setSellAmount(event.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="px-2 text-sm font-medium text-slate-600">Slippage</span>
              <select className="light-field" value={slippageBps} onChange={(event) => setSlippageBps(Number(event.target.value))}>
                <option value={30}>0.3%</option>
                <option value={50}>0.5%</option>
                <option value={100}>1%</option>
              </select>
            </label>
          </div>
        </div>

        {error ? (
          <div className="mx-1 rounded-[1.5rem] border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          className="button-primary w-full"
          disabled={!providerReady || !sellAmount || loading}
          onClick={() => void handleQuote()}
        >
          {loading ? "Loading 0x quote..." : "Get firm quote"}
        </button>
      </div>

      <aside className="space-y-6">
        <div className="premium-card space-y-3 p-5">
          <h2 className="text-xl font-semibold text-white">Quote preview</h2>
          {quote ? (
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex justify-between gap-3"><span>You pay</span><strong>{quote.sellAmountRaw} {quote.sellToken.symbol}</strong></div>
              <div className="flex justify-between gap-3"><span>You receive</span><strong>{quote.buyAmountRaw} {quote.buyToken.symbol}</strong></div>
              <div className="flex justify-between gap-3"><span>Min received</span><strong>{quote.minBuyAmountRaw ?? "n/a"}</strong></div>
              <div className="flex justify-between gap-3"><span>Route</span><strong>{quote.routeSummary.label}</strong></div>
              <div className="flex justify-between gap-3"><span>Allowance</span><strong>{quote.approvalRequired ? "required" : "not needed"}</strong></div>
              {highImpact ? (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-amber-100">
                  High price impact warning. Refresh the quote or reduce the amount.
                </div>
              ) : null}
              <button
                type="button"
                className="button-primary w-full"
                disabled={!extensionDetected}
                onClick={() => void handleExtensionSwap()}
              >
                Review swap in extension
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-300">
              Select an EVM route and request a quote. Solana/Jupiter, Tron, Bitcoin, TON, and cross-chain swaps are coming in later waves.
            </p>
          )}
        </div>

        {extensionResult ? (
          <div className="premium-card p-5 text-sm text-slate-200">
            {extensionResult}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function buildEvmTokenOptions(
  chainId: number,
  portfolioAssets?: AssetBalance[],
): TokenOption[] {
  const chain = EVM_CHAINS.find((item) => item.chainId === chainId) ?? EVM_CHAINS[0]!;
  const native: TokenOption = {
    value: "native",
    symbol: chain.nativeSymbol,
    name: chain.name,
    decimals: 18,
  };
  const portfolioTokens = (portfolioAssets ?? [])
    .filter((asset) => asset.family === "evm" && Number(asset.chainId) === chainId && asset.type === "erc20" && asset.tokenAddress)
    .map((asset) => ({
      value: asset.tokenAddress!,
      symbol: asset.symbol,
      name: asset.name,
      decimals: asset.decimals,
      balanceFormatted: asset.balanceFormatted,
    }));
  const curated = getCuratedTokens(chainId)
    .map((token) => ({
      value: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
    }));
  const byValue = new Map<string, TokenOption>();

  for (const token of [native, ...portfolioTokens, ...curated]) {
    byValue.set(token.value.toLowerCase(), token);
  }

  return Array.from(byValue.values());
}

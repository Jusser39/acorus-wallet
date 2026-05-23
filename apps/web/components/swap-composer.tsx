"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EVM_CHAINS,
  normalizeEvmTokenAmount,
  shortenFormattedEvmTokenAmount,
  validateFormattedAmount,
  type AssetBalance,
  type EvmSwapQuoteResponse,
  type RangoSwapQuoteResponse,
  type SolanaSwapQuoteResponse,
} from "@acorus/shared";
import { buildErc20ApproveTransaction } from "@acorus/wallet-core";
import {
  getEvmSwapQuote,
  getEvmSwapStatus,
  getJupiterSwapQuote,
  getRangoSwapQuote,
  getUniversalSwapStatus,
  type EvmSwapStatus,
  type UniversalSwapStatus,
} from "@/lib/api";
import {
  getExtensionChainId,
  hasAcorusExtension,
  requestExtensionEvmSendTransaction,
  requestExtensionSwap,
  requestExtensionUniversalSwap,
  switchExtensionChain,
} from "@/lib/extension-bridge";
import { getSwapCtaLabel } from "@/lib/swap-cta";
import { appendSwapHistoryEntry, loadSwapHistory, type WebSwapActivityEntry } from "@/lib/swap-history";
import {
  filterSwapTokens,
  getPopularSwapTokens,
  type SwapTokenOption,
} from "@/lib/swap-token-catalog";

export function SwapComposer(props: {
  portfolioAssets?: AssetBalance[];
  userAddress?: string | null;
  initialChainId?: number;
  initialSellToken?: string;
  initialBuyToken?: string;
  initialBuyTokenMeta?: {
    symbol: string;
    name: string;
    decimals: number;
  };
  compact?: boolean;
  title?: string;
  description?: string;
}) {
  const [status, setStatus] = useState<EvmSwapStatus | null>(null);
  const [universalStatus, setUniversalStatus] = useState<UniversalSwapStatus | null>(null);
  const [chainId, setChainId] = useState(props.initialChainId ?? 1);
  const [sellToken, setSellToken] = useState(props.initialSellToken ?? "native");
  const [buyToken, setBuyToken] = useState(props.initialBuyToken ?? "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
  const [sellAmount, setSellAmount] = useState("");
  const [slippageBps, setSlippageBps] = useState(50);
  const [approvalMode, setApprovalMode] = useState<"exact" | "infinite">("exact");
  const [quote, setQuote] = useState<EvmSwapQuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [extensionResult, setExtensionResult] = useState<string | null>(null);
  const [extensionChainId, setExtensionChainId] = useState<number | null>(null);
  const [quoteCountdown, setQuoteCountdown] = useState(0);
  const [history, setHistory] = useState<WebSwapActivityEntry[]>([]);
  const [tokenPickerSide, setTokenPickerSide] = useState<"sell" | "buy" | null>(null);
  const [tokenSearch, setTokenSearch] = useState("");
  const [jupiterInputMint, setJupiterInputMint] = useState("So11111111111111111111111111111111111111112");
  const [jupiterOutputMint, setJupiterOutputMint] = useState("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const [jupiterAmount, setJupiterAmount] = useState("1000000");
  const [jupiterResult, setJupiterResult] = useState<string | null>(null);
  const [jupiterRoute, setJupiterRoute] = useState<SolanaSwapQuoteResponse | null>(null);
  const [rangoFrom, setRangoFrom] = useState("ETH.ETH");
  const [rangoTo, setRangoTo] = useState("SOL.SOL");
  const [rangoAmount, setRangoAmount] = useState("0.01");
  const [rangoResult, setRangoResult] = useState<string | null>(null);
  const [rangoRoute, setRangoRoute] = useState<RangoSwapQuoteResponse | null>(null);
  const extensionDetected = typeof window !== "undefined" && hasAcorusExtension();

  const tokens = useMemo(
    () => getPopularSwapTokens({
      chainId,
      portfolioAssets: props.portfolioAssets,
      initialBuyToken: props.initialBuyToken,
      initialBuyTokenMeta: props.initialBuyTokenMeta,
    }),
    [chainId, props.initialBuyToken, props.initialBuyTokenMeta, props.portfolioAssets],
  );
  const selectedSellToken = tokens.find((token) => token.value === sellToken) ?? tokens[0]!;
  const selectedBuyToken = tokens.find((token) => token.value === buyToken) ?? tokens[1] ?? selectedSellToken;
  const pickerTokens = useMemo(() => filterSwapTokens(tokens, tokenSearch), [tokenSearch, tokens]);

  useEffect(() => {
    setHistory(loadSwapHistory());
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
    void getUniversalSwapStatus().then(setUniversalStatus).catch(() => setUniversalStatus(null));
  }, []);

  useEffect(() => {
    const nextTokens = getPopularSwapTokens({
      chainId,
      portfolioAssets: props.portfolioAssets,
      initialBuyToken: props.initialBuyToken,
      initialBuyTokenMeta: props.initialBuyTokenMeta,
    });
    const nextSellToken = resolveInitialTokenValue(
      nextTokens,
      props.initialSellToken,
      props.initialBuyToken ?? nextTokens[1]?.value,
    ) ?? nextTokens[0]?.value ?? "native";
    const nextBuyToken = resolveInitialTokenValue(
      nextTokens,
      props.initialBuyToken,
      nextSellToken,
    ) ?? nextTokens.find((token) => token.value.toLowerCase() !== nextSellToken.toLowerCase())?.value ?? nextSellToken;

    setSellToken(nextSellToken);
    setBuyToken(nextBuyToken);
    setQuote(null);
    setError(null);
  }, [chainId, props.initialBuyToken, props.initialBuyTokenMeta, props.initialSellToken, props.portfolioAssets]);

  useEffect(() => {
    if (tokenPickerSide) {
      setTokenSearch("");
    }
  }, [tokenPickerSide]);

  useEffect(() => {
    if (!extensionDetected) {
      setExtensionChainId(null);
      return;
    }

    void getExtensionChainId()
      .then((value) => setExtensionChainId(parseChainId(value)))
      .catch(() => setExtensionChainId(null));
  }, [extensionDetected, quote?.requestId]);

  useEffect(() => {
    if (!quote) {
      setQuoteCountdown(0);
      return;
    }

    const update = () => {
      setQuoteCountdown(
        Math.max(0, Math.ceil((new Date(quote.expiresAt).getTime() - Date.now()) / 1000)),
      );
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [quote]);

  async function handleQuote() {
    setLoading(true);
    setError(null);
    setQuote(null);
    setExtensionResult(null);

    try {
      if (!props.userAddress) {
        throw new Error("Connect Acorus extension before requesting a firm quote.");
      }

      if (sellToken.toLowerCase() === buyToken.toLowerCase()) {
        throw new Error("Choose different sell and buy tokens.");
      }

      if (!validateFormattedAmount(sellAmount)) {
        throw new Error(`Enter a valid ${selectedSellToken.symbol} amount.`);
      }

      const nextQuote = await getEvmSwapQuote({
        chainId,
        sellToken,
        buyToken,
        sellAmount: normalizeEvmTokenAmount(sellAmount, selectedSellToken.decimals),
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

  async function handleApprove() {
    if (!quote?.approval || !props.userAddress) {
      return;
    }

    try {
      const tx = buildErc20ApproveTransaction({
        chainId: quote.chainId,
        tokenAddress: quote.approval.tokenAddress,
        owner: props.userAddress,
        spender: quote.approval.spender,
        amountRaw: quote.approval.requiredAllowanceRaw ?? quote.sellAmountRaw,
        approvalMode,
      });

      await requestExtensionEvmSendTransaction({
        approvalKind: "token_approval",
        chainId: quote.chainId,
        from: props.userAddress,
        to: tx.to,
        data: tx.data,
        value: tx.value,
        tokenAddress: quote.approval.tokenAddress,
        tokenSymbol: quote.sellToken.symbol,
        spender: quote.approval.spender,
        amountRaw: tx.amountRaw,
        amountFormatted: approvalMode === "infinite"
          ? "Unlimited"
          : shortenFormattedEvmTokenAmount(tx.amountRaw, quote.sellToken.decimals),
        currentAllowanceRaw: quote.approval.currentAllowanceRaw ?? null,
        requiredAllowanceRaw: quote.approval.requiredAllowanceRaw ?? quote.sellAmountRaw,
        currentAllowanceFormatted: quote.approval.currentAllowanceRaw
          ? shortenFormattedEvmTokenAmount(quote.approval.currentAllowanceRaw, quote.sellToken.decimals)
          : "0",
        requiredAllowanceFormatted: shortenFormattedEvmTokenAmount(
          quote.approval.requiredAllowanceRaw ?? quote.sellAmountRaw,
          quote.sellToken.decimals,
        ),
        approvalMode,
      });

      setExtensionResult("Approval request queued in Acorus extension. Open the popup to confirm or reject it.");
      setHistory(appendSwapHistoryEntry({
        id: `approval_${quote.requestId}_${Date.now()}`,
        kind: "approval_requested",
        provider: "0x",
        chainId: quote.chainId,
        account: props.userAddress,
        tokenSymbol: quote.sellToken.symbol,
        amountFormatted: approvalMode === "infinite"
          ? "Unlimited"
          : shortenFormattedEvmTokenAmount(
              quote.approval.requiredAllowanceRaw ?? quote.sellAmountRaw,
              quote.sellToken.decimals,
            ),
        approvalMode,
        status: "queued",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extension approval request failed.";
      setExtensionResult(message);
      setHistory(appendSwapHistoryEntry({
        id: `approval_failed_${quote.requestId}_${Date.now()}`,
        kind: "approval_failed",
        provider: "0x",
        chainId: quote.chainId,
        account: props.userAddress,
        tokenSymbol: quote.sellToken.symbol,
        amountFormatted: shortenFormattedEvmTokenAmount(
          quote.approval.requiredAllowanceRaw ?? quote.sellAmountRaw,
          quote.sellToken.decimals,
        ),
        approvalMode,
        status: "failed",
        errorCode: "approval_request_failed",
        errorMessage: message,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
  }

  async function handleExtensionSwap() {
    if (!quote) {
      return;
    }

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
        createdAt: quote.createdAt,
        expiresAt: quote.expiresAt,
        takerAddress: quote.takerAddress,
        quoteSource: "acorus_backend_0x",
        sellTokenSymbol: quote.sellToken.symbol,
        buyTokenSymbol: quote.buyToken.symbol,
        sellAmountRaw: quote.sellAmountRaw,
        sellAmountFormatted: shortenFormattedEvmTokenAmount(quote.sellAmountRaw, quote.sellToken.decimals),
        buyAmountRaw: quote.buyAmountRaw,
        buyAmountFormatted: shortenFormattedEvmTokenAmount(quote.buyAmountRaw, quote.buyToken.decimals),
        minBuyAmountRaw: quote.minBuyAmountRaw,
        minBuyAmountFormatted: quote.minBuyAmountRaw
          ? shortenFormattedEvmTokenAmount(quote.minBuyAmountRaw, quote.buyToken.decimals)
          : null,
        slippageBps,
        priceImpact: quote.estimatedPriceImpact,
        routeLabel: quote.routeSummary.label,
      });

      setExtensionResult("Swap request queued in Acorus extension. Open the popup to approve or reject.");
      if (props.userAddress) {
        setHistory(appendSwapHistoryEntry({
          id: `swap_${quote.requestId}_${Date.now()}`,
          kind: "swap_requested",
          provider: "0x",
          chainId: quote.chainId,
          account: props.userAddress,
          sellTokenSymbol: quote.sellToken.symbol,
          buyTokenSymbol: quote.buyToken.symbol,
          amountFormatted: shortenFormattedEvmTokenAmount(quote.sellAmountRaw, quote.sellToken.decimals),
          buyAmountFormatted: shortenFormattedEvmTokenAmount(quote.buyAmountRaw, quote.buyToken.decimals),
          status: "queued",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extension swap request failed.";
      setExtensionResult(message);
      if (props.userAddress) {
        setHistory(appendSwapHistoryEntry({
          id: `swap_failed_${quote.requestId}_${Date.now()}`,
          kind: "swap_failed",
          provider: "0x",
          chainId: quote.chainId,
          account: props.userAddress,
          sellTokenSymbol: quote.sellToken.symbol,
          buyTokenSymbol: quote.buyToken.symbol,
          amountFormatted: shortenFormattedEvmTokenAmount(quote.sellAmountRaw, quote.sellToken.decimals),
          buyAmountFormatted: shortenFormattedEvmTokenAmount(quote.buyAmountRaw, quote.buyToken.decimals),
          status: "failed",
          errorCode: "swap_request_failed",
          errorMessage: message,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }
    }
  }

  async function handleSwitchChain() {
    await switchExtensionChain(chainId);
    setExtensionChainId(parseChainId(await getExtensionChainId()));
  }

  async function handleJupiterQuote() {
    setJupiterResult("Fetching Jupiter route...");
    setJupiterRoute(null);
    try {
      const route = await getJupiterSwapQuote({
        inputMint: jupiterInputMint,
        outputMint: jupiterOutputMint,
        amount: jupiterAmount,
        slippageBps,
      });
      setJupiterRoute(route);
      setJupiterResult(
        `Jupiter: ${route.inAmountRaw} -> ${route.outAmountRaw}. Route: ${
          route.routeSummary.map((step) => step.protocolName).filter(Boolean).join(" + ") || "Jupiter best route"
        }`,
      );
    } catch (err) {
      setJupiterResult(err instanceof Error ? err.message : "Unable to fetch Jupiter route.");
    }
  }

  async function handlePrimaryAction() {
    if (!props.userAddress) {
      setError("Connect Acorus extension before requesting or executing a swap.");
      return;
    }

    if (wrongChain) {
      await handleSwitchChain();
      return;
    }

    if (!quote || quoteExpired) {
      await handleQuote();
      return;
    }

    if (quote.approvalRequired) {
      await handleApprove();
      return;
    }

    await handleExtensionSwap();
  }

  function handleTokenPick(side: "sell" | "buy", value: string) {
    const currentOpposite = side === "sell" ? buyToken : sellToken;
    const nextToken = tokens.find((token) => token.value.toLowerCase() === value.toLowerCase());

    if (!nextToken) {
      return;
    }

    if (side === "sell") {
      setSellToken(nextToken.value);

      if (nextToken.value.toLowerCase() === currentOpposite.toLowerCase()) {
        setBuyToken(tokens.find((token) => token.value.toLowerCase() !== nextToken.value.toLowerCase())?.value ?? nextToken.value);
      }
    } else {
      setBuyToken(nextToken.value);

      if (nextToken.value.toLowerCase() === currentOpposite.toLowerCase()) {
        setSellToken(tokens.find((token) => token.value.toLowerCase() !== nextToken.value.toLowerCase())?.value ?? nextToken.value);
      }
    }

    setQuote(null);
    setError(null);
    setTokenPickerSide(null);
  }

  async function handleRangoQuote() {
    setRangoResult("Fetching Rango route...");
    setRangoRoute(null);
    try {
      const route = await getRangoSwapQuote({
        from: rangoFrom,
        to: rangoTo,
        amount: rangoAmount,
        slippageBps,
      });
      setRangoRoute(route);
      setRangoResult(
        `Rango: ${route.amountRaw} -> ${route.outputAmountFormatted ?? route.outputAmountRaw ?? "unknown"}. Route: ${route.routeLabel}`,
      );
    } catch (err) {
      setRangoResult(err instanceof Error ? err.message : "Unable to fetch Rango route.");
    }
  }

  async function handleUniversalSwapReview(provider: "jupiter" | "rango") {
    setExtensionResult(null);

    try {
      const route = provider === "jupiter" ? jupiterRoute : rangoRoute;

      if (!route) {
        throw new Error(`Request a ${provider} route before opening extension review.`);
      }

      await requestExtensionUniversalSwap({
        provider,
        quoteSource: provider === "jupiter" ? "acorus_backend_jupiter" : "acorus_backend_rango",
        chainId: provider === "jupiter" ? 101 : "crosschain",
        fromLabel: provider === "jupiter" ? routeLabelFromJupiter(route as SolanaSwapQuoteResponse, "input") : (route as RangoSwapQuoteResponse).from,
        toLabel: provider === "jupiter" ? routeLabelFromJupiter(route as SolanaSwapQuoteResponse, "output") : (route as RangoSwapQuoteResponse).to,
        sellAmountRaw: provider === "jupiter" ? (route as SolanaSwapQuoteResponse).inAmountRaw : (route as RangoSwapQuoteResponse).amountRaw,
        buyAmountRaw: provider === "jupiter" ? (route as SolanaSwapQuoteResponse).outAmountRaw : (route as RangoSwapQuoteResponse).outputAmountRaw ?? null,
        buyAmountFormatted: provider === "rango" ? (route as RangoSwapQuoteResponse).outputAmountFormatted ?? null : null,
        minBuyAmountRaw: provider === "jupiter" ? (route as SolanaSwapQuoteResponse).otherAmountThresholdRaw ?? null : null,
        routeLabel: provider === "jupiter"
          ? (route as SolanaSwapQuoteResponse).routeSummary.map((step) => step.protocolName).filter(Boolean).join(" + ") || "Jupiter best route"
          : (route as RangoSwapQuoteResponse).routeLabel,
        slippageBps,
        expiresAt: route.expiresAt,
        executionStatus: "review_only",
      });

      setExtensionResult(`${provider} route review queued in Acorus extension. Execution remains gated until the adapter is audited.`);
    } catch (err) {
      setExtensionResult(err instanceof Error ? err.message : "Unable to queue universal swap review.");
    }
  }

  const providerReady = Boolean(status?.configured && status.enabled);
  const highImpact = quote?.estimatedPriceImpact
    ? Number(quote.estimatedPriceImpact) > 0.05
    : false;
  const wrongChain = Boolean(quote && extensionChainId !== null && extensionChainId !== quote.chainId);
  const quoteExpired = Boolean(quote && quoteCountdown <= 0);
  const showSidePanel = !props.compact || Boolean(quote || extensionResult || history.length > 0);
  const showUniversalRouteForms = false;
  const ctaLabel = getSwapCtaLabel({
    extensionDetected,
    connected: Boolean(props.userAddress),
    quoteLoading: loading,
    quoteReady: Boolean(quote),
    approvalRequired: Boolean(quote?.approvalRequired),
    wrongChain,
    quoteExpired,
  });

  return (
    <div className={props.compact ? "grid gap-5" : "grid gap-6 xl:grid-cols-[minmax(0,640px)_minmax(320px,1fr)] xl:justify-center"}>
      <div className="acorus-card space-y-5 p-4 sm:p-5">
        <div className="px-3 pt-3">
          <span className="section-kicker !border-fuchsia-100 !bg-white/80 !text-violet-800">
            0x · Jupiter · Rango
          </span>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            {props.title ?? "Swap with Acorus"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {props.description ?? "0x handles EVM execution, while Jupiter and Rango routes can be inspected in the extension before adapter execution is enabled."}
          </p>
        </div>

        {universalStatus && showUniversalRouteForms ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {universalStatus.providers.map((provider) => (
              <div key={provider.provider} className="rounded-2xl border border-fuchsia-100 bg-white/70 p-3">
                <div className="text-sm font-semibold text-slate-950">{provider.provider}</div>
                <div className={provider.configured ? "text-xs text-emerald-600" : "text-xs text-amber-700"}>
                  {provider.configured ? "Configured" : "API key needed"}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!props.compact && !providerReady ? (
          <div className="mx-1 rounded-[1.5rem] border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-900">
            0x provider is not configured on the backend yet. Add `ZEROX_API_KEY` on the API server to enable EVM live quotes.
          </div>
        ) : null}

        {!props.compact && !extensionDetected ? (
          <div className="mx-1 rounded-[1.5rem] border border-sky-400/30 bg-sky-400/10 p-4 text-sm text-sky-900">
            Acorus extension was not detected. Install or reload the extension to execute swaps.
          </div>
        ) : null}

        <div className="grid gap-3 rounded-[1.6rem] border border-fuchsia-100 bg-white/72 p-3 shadow-sm">
          <label className="space-y-2">
            <span className="px-2 text-sm font-medium text-slate-600">EVM network</span>
            <select className="light-field" value={chainId} onChange={(event) => setChainId(Number(event.target.value))}>
              {EVM_CHAINS.map((chain) => (
                <option key={chain.chainId} value={chain.chainId}>{chain.name}</option>
              ))}
            </select>
          </label>

          <div className={props.compact ? "grid gap-2" : "grid gap-2 md:grid-cols-2"}>
            <label className="space-y-2">
              <span className="px-2 text-sm font-medium text-slate-600">Sell</span>
              <button type="button" className="swap-token-select" onClick={() => setTokenPickerSide("sell")}>
                <span className="swap-token-icon">{tokenAvatarLabel(selectedSellToken)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-black">{selectedSellToken.symbol}</span>
                  <span className="block truncate text-xs text-slate-500">{selectedSellToken.name}</span>
                </span>
                <span className="text-lg">⌄</span>
              </button>
            </label>
            <label className="space-y-2">
              <span className="px-2 text-sm font-medium text-slate-600">Buy</span>
              <button type="button" className="swap-token-select" onClick={() => setTokenPickerSide("buy")}>
                <span className="swap-token-icon">{tokenAvatarLabel(selectedBuyToken)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-black">{selectedBuyToken.symbol}</span>
                  <span className="block truncate text-xs text-slate-500">{selectedBuyToken.name}</span>
                </span>
                <span className="text-lg">⌄</span>
              </button>
            </label>
          </div>

          <div className={props.compact ? "grid gap-2" : "grid gap-2 md:grid-cols-[1fr_180px]"}>
            <label className="space-y-2">
              <span className="px-2 text-sm font-medium text-slate-600">You pay</span>
              <input
                className="light-field"
                inputMode="decimal"
                placeholder={`0.00 ${selectedSellToken.symbol}`}
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

        {!extensionDetected ? (
          <a
            className="button-primary block w-full text-center"
            href="/downloads/acorus-wallet-extension.zip"
            download
          >
            Install Acorus Extension
          </a>
        ) : (
          <button
            type="button"
            className="button-primary w-full"
            disabled={!providerReady || (!sellAmount && !quote) || loading}
            onClick={() => void handlePrimaryAction()}
          >
            {ctaLabel}
          </button>
        )}

        {showUniversalRouteForms ? (
          <>
            <div className="grid gap-3 rounded-[1.6rem] border border-fuchsia-100 bg-white/62 p-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Solana route via Jupiter</h2>
                <p className="text-xs text-slate-500">Fetch a live Solana route and queue an extension review. Execution remains gated until transaction decoding is audited.</p>
              </div>
              <input className="light-field" value={jupiterInputMint} onChange={(event) => setJupiterInputMint(event.target.value)} placeholder="Input mint" />
              <input className="light-field" value={jupiterOutputMint} onChange={(event) => setJupiterOutputMint(event.target.value)} placeholder="Output mint" />
              <input className="light-field" value={jupiterAmount} onChange={(event) => setJupiterAmount(event.target.value)} placeholder="Raw amount" />
              <button type="button" className="button-secondary" onClick={() => void handleJupiterQuote()}>
                Get Jupiter route
              </button>
              {jupiterResult ? <p className="text-sm text-slate-600">{jupiterResult}</p> : null}
              {jupiterRoute ? (
                <button
                  type="button"
                  className="button-primary"
                  disabled={!extensionDetected}
                  onClick={() => void handleUniversalSwapReview("jupiter")}
                >
                  Review Jupiter route in extension
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 rounded-[1.6rem] border border-fuchsia-100 bg-white/62 p-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Universal route via Rango</h2>
                <p className="text-xs text-slate-500">Cross-chain route discovery is backend-proxied; extension review is live, execution remains adapter-gated.</p>
              </div>
              <input className="light-field" value={rangoFrom} onChange={(event) => setRangoFrom(event.target.value)} placeholder="From asset, e.g. ETH.ETH" />
              <input className="light-field" value={rangoTo} onChange={(event) => setRangoTo(event.target.value)} placeholder="To asset, e.g. SOL.SOL" />
              <input className="light-field" value={rangoAmount} onChange={(event) => setRangoAmount(event.target.value)} placeholder="Amount" />
              <button type="button" className="button-secondary" onClick={() => void handleRangoQuote()}>
                Get Rango route
              </button>
              {rangoResult ? <p className="text-sm text-slate-600">{rangoResult}</p> : null}
              {rangoRoute ? (
                <button
                  type="button"
                  className="button-primary"
                  disabled={!extensionDetected}
                  onClick={() => void handleUniversalSwapReview("rango")}
                >
                  Review Rango route in extension
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      {showSidePanel ? (
      <aside className="space-y-6">
        <div className="premium-card space-y-3 p-5">
          <h2 className="text-xl font-semibold text-slate-950">{quote ? "Route review" : "Swap status"}</h2>
          {quote ? (
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between gap-3"><span>You pay</span><strong>{shortenFormattedEvmTokenAmount(quote.sellAmountRaw, quote.sellToken.decimals)} {quote.sellToken.symbol}</strong></div>
              <div className="flex justify-between gap-3"><span>You receive</span><strong>{shortenFormattedEvmTokenAmount(quote.buyAmountRaw, quote.buyToken.decimals)} {quote.buyToken.symbol}</strong></div>
              <div className="flex justify-between gap-3"><span>Min received</span><strong>{quote.minBuyAmountRaw ? shortenFormattedEvmTokenAmount(quote.minBuyAmountRaw, quote.buyToken.decimals) : "n/a"} {quote.buyToken.symbol}</strong></div>
              <div className="flex justify-between gap-3"><span>Route</span><strong>{quote.routeSummary.label}</strong></div>
              <div className="flex justify-between gap-3"><span>Allowance</span><strong>{quote.approvalRequired ? "required" : "not needed"}</strong></div>
              <div className="flex justify-between gap-3"><span>Quote timer</span><strong>{quoteCountdown}s</strong></div>

              {quote.approvalRequired && quote.approval ? (
                <div className="rounded-3xl border border-fuchsia-100 bg-white/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-950">Approve {quote.sellToken.symbol}</h3>
                    <span className="text-xs text-slate-400">{approvalMode === "exact" ? "Exact" : "Infinite"} approval</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-300">
                    <div className="flex justify-between gap-3"><span>Spender</span><span className="font-mono">{quote.approval.spender}</span></div>
                    <div className="flex justify-between gap-3"><span>Current allowance</span><span>{quote.approval.currentAllowanceRaw ? shortenFormattedEvmTokenAmount(quote.approval.currentAllowanceRaw, quote.sellToken.decimals) : "0"} {quote.sellToken.symbol}</span></div>
                    <div className="flex justify-between gap-3"><span>Required allowance</span><span>{shortenFormattedEvmTokenAmount(quote.approval.requiredAllowanceRaw ?? quote.sellAmountRaw, quote.sellToken.decimals)} {quote.sellToken.symbol}</span></div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button type="button" className={approvalMode === "exact" ? "button-primary" : "button-secondary"} onClick={() => setApprovalMode("exact")}>
                      Exact approval
                    </button>
                    <button type="button" className={approvalMode === "infinite" ? "button-primary" : "button-secondary"} onClick={() => setApprovalMode("infinite")}>
                      Infinite approval
                    </button>
                  </div>
                  {approvalMode === "infinite" ? (
                    <p className="mt-3 text-xs text-amber-700">
                      Infinite approval is optional and higher risk. Exact approval stays the safe default.
                    </p>
                  ) : null}
                  <button type="button" className="button-secondary mt-4 w-full" onClick={() => void handleApprove()}>
                    Queue approval in extension
                  </button>
                </div>
              ) : null}

              {wrongChain ? (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-amber-900">
                  Wrong extension chain selected.
                  <button type="button" className="button-secondary mt-3 w-full" onClick={() => void handleSwitchChain()}>
                    Switch extension to {EVM_CHAINS.find((item) => item.chainId === quote.chainId)?.name ?? quote.chainId}
                  </button>
                </div>
              ) : null}

              {highImpact ? (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-amber-900">
                  High price impact warning. Refresh the quote or reduce the amount.
                </div>
              ) : null}

              {quoteExpired ? (
                <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-rose-700">
                  Quote expired. Refresh the route before reviewing the swap.
                </div>
              ) : null}

              <button type="button" className="button-secondary w-full" onClick={() => void handleQuote()}>
                Refresh quote
              </button>
              <button
                type="button"
                className="button-primary w-full"
                disabled={!extensionDetected || quoteExpired || wrongChain}
                onClick={() => void handleExtensionSwap()}
              >
                Review swap in extension
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Select a route and request a quote. 0x EVM can execute after extension approval; Jupiter and Rango routes queue review-only approval cards.
            </p>
          )}
        </div>

        {extensionResult ? (
          <div className="premium-card p-5 text-sm text-slate-600">
            {extensionResult}
          </div>
        ) : null}

        <div className="premium-card p-5 text-sm text-slate-600">
          <h2 className="text-xl font-semibold text-slate-950">Recent swap activity</h2>
          <div className="mt-4 grid gap-3">
            {history.length ? history.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-2xl border border-fuchsia-100 bg-white/70 p-3">
                <div className="flex justify-between gap-3">
                  <span className="font-medium text-slate-950">{item.kind.replace(/_/gu, " ")}</span>
                  <span className={item.status === "failed" ? "text-rose-300" : "text-emerald-300"}>{item.status}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {item.tokenSymbol
                    ? `${item.amountFormatted ?? ""} ${item.tokenSymbol}`.trim()
                    : `${item.amountFormatted ?? ""} ${item.sellTokenSymbol ?? ""} -> ${item.buyAmountFormatted ?? ""} ${item.buyTokenSymbol ?? ""}`.trim()}
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-400">No swap or approval events queued from the web shell yet.</p>
            )}
          </div>
        </div>
      </aside>
      ) : null}

      {tokenPickerSide ? (
        <div className="token-picker-overlay" role="dialog" aria-modal="true" aria-label="Choose token">
          <div className="token-picker-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-slate-950">Choose token</h2>
              <button type="button" className="token-picker-close" onClick={() => setTokenPickerSide(null)}>
                ×
              </button>
            </div>
            <div className="token-picker-search">
              <span className="text-xl text-violet-500">⌕</span>
              <input
                value={tokenSearch}
                onChange={(event) => setTokenSearch(event.target.value)}
                placeholder="Search by token, symbol, or address"
                aria-label="Search token"
              />
              <span className="token-picker-chain">{EVM_CHAINS.find((item) => item.chainId === chainId)?.name ?? "EVM"}</span>
            </div>
            <div className="token-picker-quick">
              {tokens.slice(0, 5).map((token) => (
                <button
                  key={`quick-${token.value}`}
                  type="button"
                  className="token-picker-chip"
                  onClick={() => handleTokenPick(tokenPickerSide, token.value)}
                >
                  <span className="swap-token-icon">{tokenAvatarLabel(token)}</span>
                  {token.symbol}
                </button>
              ))}
            </div>
            <div className="token-picker-list">
              {pickerTokens.length ? pickerTokens.map((token) => (
                <button
                  key={`picker-${token.value}`}
                  type="button"
                  className="token-picker-row"
                  onClick={() => handleTokenPick(tokenPickerSide, token.value)}
                >
                  <span className="swap-token-icon">{tokenAvatarLabel(token)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-black text-slate-950">{token.name}</span>
                    <span className="block truncate text-sm text-slate-500">
                      {token.symbol}
                      {token.tokenAddress ? ` · ${shortTokenAddress(token.tokenAddress)}` : " · native"}
                    </span>
                  </span>
                  {token.balanceFormatted ? (
                    <span className="text-right text-sm font-bold text-slate-600">{token.balanceFormatted}</span>
                  ) : null}
                </button>
              )) : (
                <p className="rounded-3xl border border-fuchsia-100 bg-white/70 p-4 text-sm text-slate-600">
                  No tokens found for this network.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function resolveInitialTokenValue(
  tokens: SwapTokenOption[],
  preferred?: string,
  avoid?: string,
): string | null {
  const byPreferred = preferred
    ? tokens.find((token) => token.value.toLowerCase() === preferred.toLowerCase())
    : null;

  if (byPreferred && byPreferred.value.toLowerCase() !== avoid?.toLowerCase()) {
    return byPreferred.value;
  }

  return tokens.find((token) => token.value.toLowerCase() !== avoid?.toLowerCase())?.value ?? null;
}

function tokenAvatarLabel(token: Pick<SwapTokenOption, "symbol">): string {
  return token.symbol.slice(0, 4).toUpperCase();
}

function shortTokenAddress(value: string): string {
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function parseChainId(value: string | number | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = typeof value === "string"
    ? Number.parseInt(value, value.startsWith("0x") ? 16 : 10)
    : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function routeLabelFromJupiter(route: SolanaSwapQuoteResponse, side: "input" | "output"): string {
  const mint = side === "input" ? route.inputMint : route.outputMint;

  if (mint === "So11111111111111111111111111111111111111112") {
    return "SOL";
  }

  if (mint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") {
    return "USDC";
  }

  return `${mint.slice(0, 4)}...${mint.slice(-4)}`;
}

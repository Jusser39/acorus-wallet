"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
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
import { buildSwapApprovalTransaction } from "@acorus/wallet-core";
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
  requestAcorusExtension,
  requestAcorusProviderDiscovery,
  requestExtensionEvmSendTransaction,
  requestExtensionSwap,
  requestExtensionUniversalSwap,
  switchExtensionChain,
} from "@/lib/extension-bridge";
import { getSwapCtaLabel } from "@/lib/swap-cta";
import { appendSwapHistoryEntry, loadSwapHistory, type WebSwapActivityEntry } from "@/lib/swap-history";
import {
  filterSwapTokens,
  CROSS_CHAIN_SWAP_ID,
  SOLANA_SWAP_CHAIN_ID,
  getSwapNetworkLabel,
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
  const [quote, setQuote] = useState<EvmSwapQuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [extensionResult, setExtensionResult] = useState<string | null>(null);
  const [extensionChainId, setExtensionChainId] = useState<number | null>(null);
  const [quoteCountdown, setQuoteCountdown] = useState(0);
  const [history, setHistory] = useState<WebSwapActivityEntry[]>([]);
  const [extensionDetected, setExtensionDetected] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(props.userAddress ?? null);
  const [tokenPickerSide, setTokenPickerSide] = useState<"sell" | "buy" | null>(null);
  const [networkPickerOpen, setNetworkPickerOpen] = useState(false);
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
  const activeUserAddress = props.userAddress ?? connectedAddress;

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
  const routeNetworkOptions = useMemo(
    () => [
      ...EVM_CHAINS.map((chain) => ({
        chainId: chain.chainId,
        label: chain.name,
        caption: `${chain.nativeSymbol} network`,
      })),
      {
        chainId: SOLANA_SWAP_CHAIN_ID,
        label: "Solana",
        caption: "Popular Solana tokens",
      },
      {
        chainId: CROSS_CHAIN_SWAP_ID,
        label: "Any network",
        caption: "Route across supported networks",
      },
    ],
    [],
  );
  const selectedNetwork = routeNetworkOptions.find((option) => option.chainId === chainId) ?? routeNetworkOptions[0]!;
  const isSolanaSwap = chainId === SOLANA_SWAP_CHAIN_ID;
  const isCrossChainSwap = chainId === CROSS_CHAIN_SWAP_ID;
  const isEvmSwap = !isSolanaSwap && !isCrossChainSwap;
  const universalRoute = isSolanaSwap ? jupiterRoute : isCrossChainSwap ? rangoRoute : null;

  useEffect(() => {
    setHistory(loadSwapHistory());
    requestAcorusProviderDiscovery();
    setExtensionDetected(hasAcorusExtension());
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
    if (props.userAddress) {
      setConnectedAddress(props.userAddress);
    }
  }, [props.userAddress]);

  useEffect(() => {
    let mounted = true;

    const updateExtensionDetection = () => {
      if (mounted) {
        setExtensionDetected(hasAcorusExtension());
      }
    };

    const refreshExtensionDetection = () => {
      requestAcorusProviderDiscovery();
      updateExtensionDetection();
    };

    refreshExtensionDetection();
    const timers = [
      window.setTimeout(refreshExtensionDetection, 250),
      window.setTimeout(refreshExtensionDetection, 1_000),
    ];
    window.addEventListener("eip6963:announceProvider", updateExtensionDetection);

    return () => {
      mounted = false;
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("eip6963:announceProvider", updateExtensionDetection);
    };
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
    setJupiterRoute(null);
    setJupiterResult(null);
    setRangoRoute(null);
    setRangoResult(null);
    setError(null);
  }, [chainId, props.initialBuyToken, props.initialBuyTokenMeta, props.initialSellToken, props.portfolioAssets]);

  useEffect(() => {
    if (tokenPickerSide) {
      setTokenSearch("");
    }
  }, [tokenPickerSide]);

  useEffect(() => {
    if (!tokenPickerSide && !networkPickerOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTokenPickerSide(null);
        setNetworkPickerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [tokenPickerSide, networkPickerOpen]);

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
      let takerAddress = activeUserAddress;

      if (!takerAddress) {
        takerAddress = await handleConnectWallet();
      }

      if (!takerAddress) {
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
        taker: takerAddress,
        slippageBps,
      });

      setQuote(nextQuote);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch a route.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!quote?.approval || !activeUserAddress) {
      return;
    }

    try {
      const tx = buildSwapApprovalTransaction({
        chainId: quote.chainId,
        tokenAddress: quote.approval.tokenAddress,
        owner: activeUserAddress,
        spender: quote.approval.spender,
        requiredAmountRaw: quote.approval.requiredAllowanceRaw ?? quote.sellAmountRaw,
        currentAllowanceRaw: quote.approval.currentAllowanceRaw ?? null,
      });

      await requestExtensionEvmSendTransaction({
        approvalKind: "token_approval",
        chainId: quote.chainId,
        from: activeUserAddress,
        to: tx.to,
        data: tx.data,
        value: tx.value,
        tokenAddress: quote.approval.tokenAddress,
        tokenSymbol: quote.sellToken.symbol,
        spender: quote.approval.spender,
        amountRaw: tx.amountRaw,
        amountFormatted: shortenFormattedEvmTokenAmount(tx.amountRaw, quote.sellToken.decimals),
        currentAllowanceRaw: quote.approval.currentAllowanceRaw ?? null,
        requiredAllowanceRaw: quote.approval.requiredAllowanceRaw ?? quote.sellAmountRaw,
        currentAllowanceFormatted: quote.approval.currentAllowanceRaw
          ? shortenFormattedEvmTokenAmount(quote.approval.currentAllowanceRaw, quote.sellToken.decimals)
          : "0",
        requiredAllowanceFormatted: shortenFormattedEvmTokenAmount(
          quote.approval.requiredAllowanceRaw ?? quote.sellAmountRaw,
          quote.sellToken.decimals,
        ),
        approvalMode: "exact",
      });

      setExtensionResult("Approval request queued in Acorus extension. Open the popup to confirm or reject it.");
      setHistory(appendSwapHistoryEntry({
        id: `approval_${quote.requestId}_${Date.now()}`,
        kind: "approval_requested",
        provider: "0x",
        chainId: quote.chainId,
        account: activeUserAddress,
        tokenSymbol: quote.sellToken.symbol,
        amountFormatted: shortenFormattedEvmTokenAmount(
          tx.amountRaw,
          quote.sellToken.decimals,
        ),
        approvalMode: "exact",
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
        account: activeUserAddress,
        tokenSymbol: quote.sellToken.symbol,
        amountFormatted: shortenFormattedEvmTokenAmount(
          quote.approval.requiredAllowanceRaw ?? quote.sellAmountRaw,
          quote.sellToken.decimals,
        ),
        approvalMode: "exact",
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
      if (activeUserAddress) {
        setHistory(appendSwapHistoryEntry({
          id: `swap_${quote.requestId}_${Date.now()}`,
          kind: "swap_requested",
          provider: "0x",
          chainId: quote.chainId,
          account: activeUserAddress,
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
      if (activeUserAddress) {
        setHistory(appendSwapHistoryEntry({
          id: `swap_failed_${quote.requestId}_${Date.now()}`,
          kind: "swap_failed",
          provider: "0x",
          chainId: quote.chainId,
          account: activeUserAddress,
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

  async function handleConnectWallet(): Promise<string | null> {
    setError(null);
    setExtensionResult(null);
    requestAcorusProviderDiscovery();

    try {
      const accounts = await requestAcorusExtension<string[]>("eth_requestAccounts");
      const account = Array.isArray(accounts) ? accounts[0] ?? null : null;

      if (!account) {
        throw new Error("Acorus extension did not return an account.");
      }

      setConnectedAddress(account);
      setExtensionDetected(true);
      return account;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to connect Acorus extension.";
      setError(message);
      return null;
    }
  }

  async function handleJupiterQuote() {
    setJupiterResult("Finding route...");
    setJupiterRoute(null);
    setError(null);
    try {
      const inputMint = isSolanaSwap ? selectedSellToken.value : jupiterInputMint;
      const outputMint = isSolanaSwap ? selectedBuyToken.value : jupiterOutputMint;
      const formattedAmount = isSolanaSwap ? sellAmount : jupiterAmount;

      if (inputMint.toLowerCase() === outputMint.toLowerCase()) {
        throw new Error("Choose different Solana tokens.");
      }

      if (!validateFormattedAmount(formattedAmount)) {
        throw new Error(`Enter a valid ${selectedSellToken.symbol} amount.`);
      }

      const amount = isSolanaSwap
        ? normalizeEvmTokenAmount(formattedAmount, selectedSellToken.decimals)
        : formattedAmount;

      const route = await getJupiterSwapQuote({
        inputMint,
        outputMint,
        amount,
        slippageBps,
      });
      setJupiterRoute(route);
      setJupiterResult(
        `Route found: ${route.inAmountRaw} -> ${route.outAmountRaw}. Path: ${
          route.routeSummary.map((step) => step.protocolName).filter(Boolean).join(" + ") || "Best available route"
        }`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to find a route.";
      setJupiterResult(message);
      setError(message);
    }
  }

  async function handlePrimaryAction() {
    if (isSolanaSwap) {
      if (!jupiterRoute) {
        await handleJupiterQuote();
        return;
      }

      await handleUniversalSwapReview("jupiter");
      return;
    }

    if (isCrossChainSwap) {
      if (!rangoRoute) {
        await handleRangoQuote();
        return;
      }

      await handleUniversalSwapReview("rango");
      return;
    }

    if (!activeUserAddress) {
      await handleConnectWallet();
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
    setJupiterRoute(null);
    setJupiterResult(null);
    setRangoRoute(null);
    setRangoResult(null);
    setError(null);
    setTokenPickerSide(null);
    setNetworkPickerOpen(false);
  }

  function handleNetworkPick(nextChainId: number) {
    setChainId(nextChainId);
    setTokenPickerSide(null);
    setNetworkPickerOpen(false);
    setTokenSearch("");
    setQuote(null);
    setJupiterRoute(null);
    setJupiterResult(null);
    setRangoRoute(null);
    setRangoResult(null);
    setError(null);
    setExtensionResult(null);
  }

  function renderInlineTokenPicker(side: "sell" | "buy") {
    return (
      <div className="token-inline-picker" role="dialog" aria-label="Choose token">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-950">Choose token</h2>
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
          <span className="token-picker-chain">{getSwapNetworkLabel(chainId)}</span>
        </div>
        <div className="token-picker-quick">
          {tokens.slice(0, 5).map((token) => (
            <button
              key={`quick-${side}-${token.value}`}
              type="button"
              className="token-picker-chip"
              onClick={() => handleTokenPick(side, token.value)}
            >
              <TokenIcon token={token} />
              {token.symbol}
            </button>
          ))}
        </div>
        <p className="token-picker-section-label">{getTokenPickerSectionLabel(chainId)}</p>
        <div className="token-picker-list">
          {pickerTokens.length ? pickerTokens.map((token) => (
            <button
              key={`picker-${side}-${token.value}`}
              type="button"
              className="token-picker-row"
              onClick={() => handleTokenPick(side, token.value)}
            >
              <TokenIcon token={token} />
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
    );
  }

  async function handleRangoQuote() {
    setRangoResult("Finding route...");
    setRangoRoute(null);
    setError(null);
    try {
      const from = isCrossChainSwap ? selectedSellToken.value : rangoFrom;
      const to = isCrossChainSwap ? selectedBuyToken.value : rangoTo;
      const amount = isCrossChainSwap ? sellAmount : rangoAmount;

      if (from.toLowerCase() === to.toLowerCase()) {
        throw new Error("Choose different assets.");
      }

      if (!validateFormattedAmount(amount)) {
        throw new Error(`Enter a valid ${selectedSellToken.symbol} amount.`);
      }

      const route = await getRangoSwapQuote({
        from,
        to,
        amount,
        slippageBps,
      });
      setRangoRoute(route);
      setRangoResult(
        `Route found: ${route.amountRaw} -> ${route.outputAmountFormatted ?? route.outputAmountRaw ?? "unknown"}. Path: ${route.routeLabel}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to find a route.";
      setRangoResult(message);
      setError(message);
    }
  }

  async function handleUniversalSwapReview(provider: "jupiter" | "rango") {
    setExtensionResult(null);

    try {
      const route = provider === "jupiter" ? jupiterRoute : rangoRoute;

      if (!route) {
        throw new Error("Request a route before opening extension review.");
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
          ? (route as SolanaSwapQuoteResponse).routeSummary.map((step) => step.protocolName).filter(Boolean).join(" + ") || "Best available route"
          : (route as RangoSwapQuoteResponse).routeLabel,
        slippageBps,
        expiresAt: route.expiresAt,
        executionStatus: "review_only",
      });

      setExtensionResult("Route review queued in Acorus extension. Execution remains gated until this route is fully supported.");
    } catch (err) {
      setExtensionResult(err instanceof Error ? err.message : "Unable to queue universal swap review.");
    }
  }

  const providerReady = isEvmSwap
    ? Boolean(status?.configured && status.enabled)
    : true;
  const highImpact = quote?.estimatedPriceImpact
    ? Number(quote.estimatedPriceImpact) > 0.05
    : false;
  const wrongChain = Boolean(isEvmSwap && quote && extensionChainId !== null && extensionChainId !== quote.chainId);
  const quoteExpired = Boolean(quote && quoteCountdown <= 0);
  const showSidePanel = !props.compact || Boolean(quote || universalRoute || extensionResult || history.length > 0);
  const showUniversalRouteForms = false;
  const ctaLabel = isEvmSwap
    ? getSwapCtaLabel({
        extensionDetected,
        connected: Boolean(activeUserAddress),
        quoteLoading: loading,
        quoteReady: Boolean(quote),
        approvalRequired: Boolean(quote?.approvalRequired),
        wrongChain,
        quoteExpired,
      })
    : getUniversalSwapCtaLabel({
        loading,
        routeReady: Boolean(universalRoute),
      });

  return (
    <div className={props.compact ? "grid gap-5" : "grid gap-6 xl:grid-cols-[minmax(0,640px)_minmax(320px,1fr)] xl:justify-center"}>
      <div className="acorus-card space-y-5 p-4 sm:p-5">
        <div className="px-3 pt-3">
          <span className="section-kicker !border-fuchsia-100 !bg-white/80 !text-violet-800">
            Swap
          </span>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            {props.title ?? "Swap"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {props.description ?? "Choose a network and tokens, then request the best available route. Every swap requires extension review before anything is signed."}
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
            Live routes are not configured for this network yet. Try another network or check backend status.
          </div>
        ) : null}

        {!props.compact && !extensionDetected ? (
          <div className="mx-1 rounded-[1.5rem] border border-sky-400/30 bg-sky-400/10 p-4 text-sm text-sky-900">
            Acorus extension was not detected. Install or reload the extension to execute swaps.
          </div>
        ) : null}

        <div className="grid gap-3 rounded-[1.6rem] border border-fuchsia-100 bg-white/72 p-3 shadow-sm">
          <div className="swap-network-field">
            <span className="px-2 text-sm font-medium text-slate-600">Network</span>
            <button
              type="button"
              className="swap-network-select"
              aria-expanded={networkPickerOpen}
              aria-label="Choose swap network"
              onClick={() => {
                setTokenPickerSide(null);
                setNetworkPickerOpen((open) => !open);
              }}
            >
              <span className="swap-network-dot" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-black text-slate-950">{selectedNetwork.label}</span>
                <span className="block truncate text-xs text-slate-500">{selectedNetwork.caption}</span>
              </span>
              <span className="text-lg" aria-hidden="true">⌄</span>
            </button>
            {networkPickerOpen ? (
              <div className="swap-network-menu" role="listbox" aria-label="Choose network">
                {routeNetworkOptions.map((option) => (
                  <button
                    key={option.chainId}
                    type="button"
                    className="swap-network-option"
                    data-active={option.chainId === chainId}
                    role="option"
                    aria-selected={option.chainId === chainId}
                    onClick={() => handleNetworkPick(option.chainId)}
                  >
                    <span className="font-black text-slate-950">{option.label}</span>
                    <span className="swap-network-caption">{option.caption}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 relative">
            <div className="swap-panel-inner relative">
              <span className="px-1 text-sm font-medium text-slate-500 mb-2 block">You pay</span>
              <div className="flex items-center gap-3">
                <input
                  className="swap-input-huge flex-1"
                  inputMode="decimal"
                  placeholder="0"
                  value={sellAmount}
                  onChange={(event) => setSellAmount(event.target.value)}
                />
                <button
                  type="button"
                  className="swap-token-select flex-shrink-0"
                  aria-expanded={tokenPickerSide === "sell"}
                  onClick={() => {
                    setNetworkPickerOpen(false);
                    setTokenPickerSide(tokenPickerSide === "sell" ? null : "sell");
                  }}
                >
                  <TokenIcon token={selectedSellToken} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-black">{selectedSellToken.symbol}</span>
                  </span>
                  <span className="text-lg">⌄</span>
                </button>
              </div>
            </div>

            <button 
              type="button" 
              className="swap-direction-btn"
              onClick={() => {
                const temp = sellToken;
                setSellToken(buyToken);
                setBuyToken(temp);
                setQuote(null);
                setJupiterRoute(null);
                setJupiterResult(null);
                setRangoRoute(null);
                setRangoResult(null);
              }}
            >
              ↓
            </button>

            <div className="swap-panel-inner relative">
              <span className="px-1 text-sm font-medium text-slate-500 mb-2 block">You receive</span>
              <div className="flex items-center gap-3">
                <input
                  className="swap-input-huge flex-1"
                  inputMode="decimal"
                  placeholder="0"
                  value={
                    quote ? shortenFormattedEvmTokenAmount(quote.buyAmountRaw, quote.buyToken.decimals) : 
                    isSolanaSwap && jupiterRoute ? shortenFormattedEvmTokenAmount((jupiterRoute as SolanaSwapQuoteResponse).outAmountRaw, selectedBuyToken.decimals) :
                    isCrossChainSwap && rangoRoute ? ((rangoRoute as RangoSwapQuoteResponse).outputAmountFormatted || "0") :
                    ""
                  }
                  readOnly
                />
                <button
                  type="button"
                  className="swap-token-select flex-shrink-0"
                  aria-expanded={tokenPickerSide === "buy"}
                  onClick={() => {
                    setNetworkPickerOpen(false);
                    setTokenPickerSide(tokenPickerSide === "buy" ? null : "buy");
                  }}
                >
                  <TokenIcon token={selectedBuyToken} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-black">{selectedBuyToken.symbol}</span>
                  </span>
                  <span className="text-lg">⌄</span>
                </button>
              </div>
            </div>

            <div className="mt-2 flex justify-between items-center px-2">
              <span className="text-sm font-medium text-slate-500">Slippage Tolerance</span>
              <select className="bg-transparent text-sm font-medium text-slate-700 outline-none" value={slippageBps} onChange={(event) => setSlippageBps(Number(event.target.value))}>
                <option value={30}>0.3%</option>
                <option value={50}>0.5%</option>
                <option value={100}>1%</option>
              </select>
            </div>
            {tokenPickerSide ? renderInlineTokenPicker(tokenPickerSide) : null}
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
            href="/extension"
          >
            Connect Acorus wallet
          </a>
        ) : (
          <button
            type="button"
            className="button-primary w-full"
            disabled={!providerReady || (!sellAmount && !quote && !universalRoute) || loading}
            onClick={() => void handlePrimaryAction()}
          >
            {ctaLabel}
          </button>
        )}

        {showUniversalRouteForms ? (
          <>
            <div className="grid gap-3 rounded-[1.6rem] border border-fuchsia-100 bg-white/62 p-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Network route</h2>
                <p className="text-xs text-slate-500">Fetch a live route and queue an extension review. Execution remains gated until transaction decoding is audited.</p>
              </div>
              <input className="light-field" value={jupiterInputMint} onChange={(event) => setJupiterInputMint(event.target.value)} placeholder="Input mint" />
              <input className="light-field" value={jupiterOutputMint} onChange={(event) => setJupiterOutputMint(event.target.value)} placeholder="Output mint" />
              <input className="light-field" value={jupiterAmount} onChange={(event) => setJupiterAmount(event.target.value)} placeholder="Raw amount" />
              <button type="button" className="button-secondary" onClick={() => void handleJupiterQuote()}>
                Get route
              </button>
              {jupiterResult ? <p className="text-sm text-slate-600">{jupiterResult}</p> : null}
              {jupiterRoute ? (
                <button
                  type="button"
                  className="button-primary"
                  disabled={!extensionDetected}
                  onClick={() => void handleUniversalSwapReview("jupiter")}
                >
                  Review route in extension
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 rounded-[1.6rem] border border-fuchsia-100 bg-white/62 p-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Multi-network route</h2>
                <p className="text-xs text-slate-500">Route discovery is backend-proxied; extension review is live, execution remains adapter-gated.</p>
              </div>
              <input className="light-field" value={rangoFrom} onChange={(event) => setRangoFrom(event.target.value)} placeholder="From asset, e.g. ETH.ETH" />
              <input className="light-field" value={rangoTo} onChange={(event) => setRangoTo(event.target.value)} placeholder="To asset, e.g. SOL.SOL" />
              <input className="light-field" value={rangoAmount} onChange={(event) => setRangoAmount(event.target.value)} placeholder="Amount" />
              <button type="button" className="button-secondary" onClick={() => void handleRangoQuote()}>
                Get route
              </button>
              {rangoResult ? <p className="text-sm text-slate-600">{rangoResult}</p> : null}
              {rangoRoute ? (
                <button
                  type="button"
                  className="button-primary"
                  disabled={!extensionDetected}
                  onClick={() => void handleUniversalSwapReview("rango")}
                >
                  Review route in extension
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      {showSidePanel ? (
      <aside className="space-y-6">
        <div className="premium-card space-y-3 p-5">
          <h2 className="text-xl font-semibold text-slate-950">{quote || universalRoute ? "Route review" : "Swap status"}</h2>
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
                    <span className="text-xs text-slate-400">Exact approval</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-300">
                    <div className="flex justify-between gap-3"><span>Spender</span><span className="font-mono">{quote.approval.spender}</span></div>
                    <div className="flex justify-between gap-3"><span>Current allowance</span><span>{quote.approval.currentAllowanceRaw ? shortenFormattedEvmTokenAmount(quote.approval.currentAllowanceRaw, quote.sellToken.decimals) : "0"} {quote.sellToken.symbol}</span></div>
                    <div className="flex justify-between gap-3"><span>Required allowance</span><span>{shortenFormattedEvmTokenAmount(quote.approval.requiredAllowanceRaw ?? quote.sellAmountRaw, quote.sellToken.decimals)} {quote.sellToken.symbol}</span></div>
                  </div>
                  <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                    Acorus queues only the exact allowance required for this quote. Refresh the quote if the amount changes.
                  </p>
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
          ) : universalRoute ? (
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between gap-3">
                <span>Route type</span>
                <strong>{getSwapNetworkLabel(chainId)}</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>You pay</span>
                <strong>
                  {isSolanaSwap
                    ? shortenFormattedEvmTokenAmount((universalRoute as SolanaSwapQuoteResponse).inAmountRaw, selectedSellToken.decimals)
                    : (universalRoute as RangoSwapQuoteResponse).amountRaw} {selectedSellToken.symbol}
                </strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>You receive</span>
                <strong>
                  {isSolanaSwap
                    ? shortenFormattedEvmTokenAmount((universalRoute as SolanaSwapQuoteResponse).outAmountRaw, selectedBuyToken.decimals)
                    : (universalRoute as RangoSwapQuoteResponse).outputAmountFormatted ?? (universalRoute as RangoSwapQuoteResponse).outputAmountRaw ?? "Route estimate"} {selectedBuyToken.symbol}
                </strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>Route</span>
                <strong>
                  {isSolanaSwap
                    ? (universalRoute as SolanaSwapQuoteResponse).routeSummary.map((step) => step.protocolName).filter(Boolean).join(" + ") || "Best available route"
                    : (universalRoute as RangoSwapQuoteResponse).routeLabel}
                </strong>
              </div>
              <div className="rounded-2xl border border-sky-400/30 bg-sky-400/10 p-3 text-sky-900">
                This route is ready for extension review. Execution remains gated until the selected route adapter is audited.
              </div>
              <button
                type="button"
                className="button-primary w-full"
                disabled={!extensionDetected}
                onClick={() => void handleUniversalSwapReview(isSolanaSwap ? "jupiter" : "rango")}
              >
                Review route in extension
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Select a network and tokens, then request a quote. Available routes can execute only after extension approval.
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

function TokenIcon({ token }: { token: Pick<SwapTokenOption, "symbol" | "logoUrl"> }) {
  return (
    <span className="swap-token-icon" style={tokenIconStyle(token.symbol)}>
      <span>{tokenAvatarLabel(token)}</span>
      {token.logoUrl ? (
        <img
          src={token.logoUrl}
          alt=""
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </span>
  );
}

function tokenIconStyle(symbol: string): CSSProperties {
  const gradients = [
    ["#7cf7ff", "#8b5cf6", "#ff7adf"],
    ["#ffd166", "#f97316", "#ef4444"],
    ["#34d399", "#14b8a6", "#2563eb"],
    ["#a7f3d0", "#22c55e", "#0f766e"],
    ["#c4b5fd", "#7c3aed", "#312e81"],
    ["#f9a8d4", "#ec4899", "#7e22ce"],
  ];
  const index = Array.from(symbol).reduce((sum, char) => sum + char.charCodeAt(0), 0) % gradients.length;
  const [a, b, c] = gradients[index]!;

  return {
    "--token-icon-a": a,
    "--token-icon-b": b,
    "--token-icon-c": c,
  } as CSSProperties;
}

function getTokenPickerSectionLabel(chainId: number): string {
  if (chainId === SOLANA_SWAP_CHAIN_ID) {
    return "Popular Solana tokens by 24h volume";
  }

  if (chainId === CROSS_CHAIN_SWAP_ID) {
    return "Popular assets across networks";
  }

  return "Popular tokens on this network";
}

function getUniversalSwapCtaLabel(input: {
  loading: boolean;
  routeReady: boolean;
}): string {
  if (input.loading) {
    return "Finding route...";
  }

  if (!input.routeReady) {
    return "Get route";
  }

  return "Review route";
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

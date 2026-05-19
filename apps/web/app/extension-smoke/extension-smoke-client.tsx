"use client";

import { useEffect, useMemo, useState } from "react";

type SmokeResult = {
  label: string;
  ok: boolean;
  output: string;
};

type ProviderKey = "ethereum" | "acorus" | "solana" | "tronLink";

type SmokeEvent = {
  label: string;
  detail: string;
  at: string;
};

type SecurityStatus = {
  protocol: string;
  origin: string;
  secureContext: boolean;
  status: "secure" | "insecure";
};

const SWITCH_TARGETS = [
  { label: "Polygon", chainId: "0x89" },
  { label: "Base", chainId: "0x2105" },
  { label: "BNB", chainId: "0x38" },
];

export function ExtensionSmokeClient() {
  const [providers, setProviders] = useState<Record<ProviderKey, boolean>>({
    ethereum: false,
    acorus: false,
    solana: false,
    tronLink: false,
  });
  const [results, setResults] = useState<SmokeResult[]>([]);
  const [events, setEvents] = useState<SmokeEvent[]>([]);
  const [security, setSecurity] = useState<SecurityStatus>({
    protocol: "unknown",
    origin: "unknown",
    secureContext: false,
    status: "insecure",
  });
  const [txTo, setTxTo] = useState("");
  const [txValue, setTxValue] = useState("0x0");
  const [swapStatus, setSwapStatus] = useState<{
    configured?: boolean;
    enabled?: boolean;
    provider?: string;
    supportedChains?: number[];
  } | null>(null);
  const [swapSellToken, setSwapSellToken] = useState("ETH");
  const [swapBuyToken, setSwapBuyToken] = useState("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
  const [swapTaker, setSwapTaker] = useState("");
  const [swapAmount, setSwapAmount] = useState("1000000000000000");
  const providerRows = useMemo(
    () => Object.entries(providers) as Array<[ProviderKey, boolean]>,
    [providers],
  );
  const solanaCapabilities = typeof window === "undefined"
    ? null
    : window.solana?.capabilities
      ?? window.solana?.supportedMethods
      ?? null;

  useEffect(() => {
    refreshDiagnostics();
    const ethereum = window.ethereum;
    const logEthereumAccounts = (accounts: unknown) => appendEvent("accountsChanged", accounts);
    const logEthereumChain = (chainId: unknown) => appendEvent("chainChanged", chainId);
    const logSolanaConnect = (event: Event) => appendEvent(
      "acorusSolana#connect",
      event instanceof CustomEvent ? event.detail : null,
    );
    const logSolanaDisconnect = () => appendEvent("acorusSolana#disconnect", null);

    ethereum?.on?.("accountsChanged", logEthereumAccounts);
    ethereum?.on?.("chainChanged", logEthereumChain);
    window.addEventListener("acorusSolana#connect", logSolanaConnect);
    window.addEventListener("acorusSolana#disconnect", logSolanaDisconnect);

    return () => {
      ethereum?.removeListener?.("accountsChanged", logEthereumAccounts);
      ethereum?.removeListener?.("chainChanged", logEthereumChain);
      window.removeEventListener("acorusSolana#connect", logSolanaConnect);
      window.removeEventListener("acorusSolana#disconnect", logSolanaDisconnect);
    };
  }, []);

  function refreshDiagnostics() {
    setProviders({
      ethereum: Boolean(window.ethereum?.request),
      acorus: Boolean(window.acorus),
      solana: Boolean(window.solana),
      tronLink: Boolean(window.tronLink),
    });
    setSecurity({
      protocol: window.location.protocol,
      origin: window.location.origin,
      secureContext: window.isSecureContext,
      status: window.location.protocol === "https:" && window.isSecureContext
        ? "secure"
        : "insecure",
    });
    void fetch("/api/swap/evm/status")
      .then((response) => response.json())
      .then(setSwapStatus)
      .catch(() => setSwapStatus({ configured: false, enabled: false, provider: "0x" }));
  }

  async function run(label: string, method: string, params?: unknown[]) {
    try {
      const result = await window.ethereum?.request?.({ method, params });
      appendResult({ label, ok: true, output: stringify(result) });
    } catch (error) {
      appendResult({ label, ok: false, output: stringifyError(error) });
    }
  }

  async function runSolana(label: string, action: () => Promise<unknown>) {
    try {
      const result = await action();
      appendResult({ label, ok: true, output: stringify(result) });
    } catch (error) {
      appendResult({ label, ok: false, output: stringifyError(error) });
    }
  }

  function appendResult(result: SmokeResult) {
    setResults((items) => [result, ...items].slice(0, 12));
  }

  function appendEvent(label: string, detail: unknown) {
    setEvents((items) => [
      {
        label,
        detail: stringify(detail),
        at: new Date().toISOString(),
      },
      ...items,
    ].slice(0, 20));
  }

  async function copyDiagnostics() {
    const diagnostics = {
      providers,
      security,
      events,
      results,
      solanaCapabilities,
      swapStatus,
    };

    await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    appendResult({ label: "copy diagnostics", ok: true, output: "Diagnostics copied." });
  }

  async function runSwapStatus() {
    try {
      const response = await fetch("/api/swap/evm/status");
      const payload = await response.json();
      setSwapStatus(payload);
      appendResult({ label: "swap status", ok: response.ok, output: stringify(payload) });
    } catch (error) {
      appendResult({ label: "swap status", ok: false, output: stringifyError(error) });
    }
  }

  async function runSwapPrice() {
    try {
      const params = new URLSearchParams({
        chainId: "1",
        sellToken: swapSellToken,
        buyToken: swapBuyToken,
        sellAmount: swapAmount,
        taker: swapTaker,
        slippageBps: "50",
      });
      const response = await fetch(`/api/swap/evm/0x/price?${params.toString()}`);
      const payload = await response.json();
      appendResult({ label: "0x price", ok: response.ok, output: stringify(payload) });
    } catch (error) {
      appendResult({ label: "0x price", ok: false, output: stringifyError(error) });
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <div className="data-card rounded-[2rem] p-6">
        <p className="section-kicker">Extension smoke</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Manual dApp provider harness
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          Reload the Acorus extension, open this page, then run the buttons below.
          This page never asks for seed phrase, passcode, private key, or raw signing
          material.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="premium-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Detected providers</h2>
            <button className="button-secondary" onClick={refreshDiagnostics}>
              Refresh
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            {providerRows.map(([key, detected]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <span className="font-mono text-sm">window.{key}</span>
                <span className={detected ? "text-emerald-300" : "text-slate-500"}>
                  {detected ? "detected" : "missing"}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <div className="flex items-center justify-between gap-3">
              <span>Origin</span>
              <span className="font-mono text-xs">{security.origin}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>Protocol</span>
              <span className={security.status === "secure" ? "text-emerald-300" : "text-rose-300"}>
                {security.protocol} · {security.secureContext ? "secure context" : "not secure context"}
              </span>
            </div>
          </div>
        </section>

        <section className="premium-card p-5">
          <h2 className="text-xl font-semibold">Provider actions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button className="button-secondary" onClick={() => void run("eth_requestAccounts", "eth_requestAccounts")}>
              eth_requestAccounts
            </button>
            <button className="button-secondary" onClick={() => void run("eth_chainId", "eth_chainId")}>
              eth_chainId
            </button>
            {SWITCH_TARGETS.map((target) => (
              <button
                key={target.chainId}
                className="button-secondary"
                onClick={() => void run(`switch ${target.label}`, "wallet_switchEthereumChain", [{ chainId: target.chainId }])}
              >
                Switch {target.label}
              </button>
            ))}
            <button
              className="button-secondary"
              onClick={() => void run("wallet_addEthereumChain", "wallet_addEthereumChain", [testCustomChain()])}
            >
              wallet_addEthereumChain
            </button>
            <button
              className="button-secondary"
              onClick={() => void run("wallet_watchAsset USDC", "wallet_watchAsset", [watchUsdcAsset()])}
            >
              wallet_watchAsset USDC
            </button>
            <button
              className="button-secondary"
              onClick={() => void run("personal_sign", "personal_sign", ["Acorus smoke test message", null])}
            >
              personal_sign
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
            <h3 className="font-semibold text-amber-100">Disabled send composer</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_0.45fr_auto]">
              <input
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none"
                placeholder="Recipient 0x..."
                value={txTo}
                onChange={(event) => setTxTo(event.target.value)}
              />
              <input
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none"
                value={txValue}
                onChange={(event) => setTxValue(event.target.value)}
              />
              <button className="button-secondary opacity-60" disabled title={`${txTo} ${txValue}`}>
                Dry tx disabled
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="premium-card p-5">
        <h2 className="text-xl font-semibold">Solana diagnostics</h2>
        <p className="mt-2 text-sm text-slate-400">
          Uses the Acorus Solana provider subset: connect, publicKey, signMessage.
          Transaction send stays disabled here unless you intentionally test from
          the extension popup.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button
            className="button-secondary"
            onClick={() => void runSolana("solana.connect", async () => window.solana?.connect?.())}
          >
            Solana connect
          </button>
          <button
            className="button-secondary"
            onClick={() => void runSolana("solana.publicKey", async () => window.solana?.publicKey?.toString?.() ?? null)}
          >
            Get public key
          </button>
          <button
            className="button-secondary"
            onClick={() => void runSolana("solana.signMessage", async () => window.solana?.signMessage?.("Acorus Solana smoke test"))}
          >
            Sign message
          </button>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <span className="font-semibold text-white">Capabilities: </span>
          <span className="font-mono text-xs">
            {stringify(solanaCapabilities)}
          </span>
        </div>
      </section>

      <section className="premium-card p-5">
        <h2 className="text-xl font-semibold">EVM 0x swap diagnostics</h2>
        <p className="mt-2 text-sm text-slate-400">
          Checks the Acorus backend proxy only. The 0x API key is never exposed to this page.
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <span className="font-semibold text-white">Status: </span>
          <span className="font-mono text-xs">{stringify(swapStatus)}</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none" value={swapSellToken} onChange={(event) => setSwapSellToken(event.target.value)} placeholder="sellToken ETH or 0x..." />
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none" value={swapBuyToken} onChange={(event) => setSwapBuyToken(event.target.value)} placeholder="buyToken 0x..." />
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none" value={swapAmount} onChange={(event) => setSwapAmount(event.target.value)} placeholder="sellAmount raw" />
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none" value={swapTaker} onChange={(event) => setSwapTaker(event.target.value)} placeholder="taker 0x..." />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="button-secondary"
            onClick={() => void runSwapStatus()}
          >
            Refresh swap status
          </button>
          <button
            className="button-secondary"
            disabled={!swapTaker}
            onClick={() => void runSwapPrice()}
          >
            Test 0x price
          </button>
          <button className="button-secondary opacity-60" disabled>
            Quote/execution smoke requires manual wallet review
          </button>
        </div>
        <div className="mt-4 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 p-4 text-sm text-fuchsia-100">
          Swap checklist: connect EVM, choose chain, get price, fetch quote, approve token if required, reject one swap, then run only a tiny intentional swap.
        </div>
      </section>

      <section className="premium-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Event log</h2>
          <div className="flex gap-2">
            <button className="button-secondary" onClick={() => void copyDiagnostics()}>
              Copy diagnostics
            </button>
            <button className="button-secondary" onClick={() => setEvents([])}>
              Clear log
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {events.length ? events.map((event, index) => (
            <pre
              key={`${event.label}-${event.at}-${index}`}
              className="overflow-auto rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-xs text-sky-100"
            >
              {event.at} · {event.label}: {event.detail}
            </pre>
          )) : (
            <p className="text-sm text-slate-400">No provider events have fired yet.</p>
          )}
        </div>
      </section>

      <section className="premium-card p-5">
        <h2 className="text-xl font-semibold">Results</h2>
        <div className="mt-4 grid gap-3">
          {results.length ? results.map((result, index) => (
            <pre
              key={`${result.label}-${index}`}
              className={`overflow-auto rounded-2xl border p-4 text-xs ${
                result.ok
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                  : "border-rose-400/20 bg-rose-400/10 text-rose-100"
              }`}
            >
              {result.label}: {result.output}
            </pre>
          )) : (
            <p className="text-sm text-slate-400">No smoke actions have run yet.</p>
          )}
        </div>
      </section>
    </section>
  );
}

function testCustomChain() {
  return {
    chainId: "0x14a34",
    chainName: "Base Sepolia",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: ["https://sepolia.base.org"],
    blockExplorerUrls: ["https://sepolia.basescan.org"],
  };
}

function watchUsdcAsset() {
  return {
    type: "ERC20",
    options: {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      symbol: "USDC",
      decimals: 6,
    },
  };
}

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? "undefined";
}

function stringifyError(error: unknown): string {
  if (error && typeof error === "object") {
    const record = error as { code?: unknown; message?: unknown };
    return JSON.stringify({
      code: record.code ?? "unknown",
      message: record.message ?? String(error),
    }, null, 2);
  }

  return String(error);
}

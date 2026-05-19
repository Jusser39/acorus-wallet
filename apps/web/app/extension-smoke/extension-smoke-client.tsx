"use client";

import { useEffect, useMemo, useState } from "react";

type SmokeResult = {
  label: string;
  ok: boolean;
  output: string;
};

type ProviderKey = "ethereum" | "acorus" | "solana" | "tronLink";

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
  const [txTo, setTxTo] = useState("");
  const [txValue, setTxValue] = useState("0x0");
  const providerRows = useMemo(
    () => Object.entries(providers) as Array<[ProviderKey, boolean]>,
    [providers],
  );

  useEffect(() => {
    setProviders({
      ethereum: Boolean(window.ethereum?.request),
      acorus: Boolean(window.acorus),
      solana: Boolean(window.solana),
      tronLink: Boolean(window.tronLink),
    });
  }, []);

  async function run(label: string, method: string, params?: unknown[]) {
    try {
      const result = await window.ethereum?.request?.({ method, params });
      appendResult({ label, ok: true, output: stringify(result) });
    } catch (error) {
      appendResult({ label, ok: false, output: stringifyError(error) });
    }
  }

  function appendResult(result: SmokeResult) {
    setResults((items) => [result, ...items].slice(0, 12));
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
          <h2 className="text-xl font-semibold">Detected providers</h2>
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

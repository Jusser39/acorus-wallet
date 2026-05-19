"use client";

import { useEffect, useMemo, useState } from "react";

type EthereumRequestArgs = {
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

type EthereumProvider = {
  isAcorus?: boolean;
  isMetaMask?: boolean;
  isTrust?: boolean;
  selectedAddress?: string | null;
  chainId?: string | null;
  request: <T = unknown>(args: EthereumRequestArgs) => Promise<T>;
  on?: (eventName: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (eventName: string, listener: (...args: unknown[]) => void) => void;
};

type Eip6963ProviderDetail = {
  info: {
    uuid: string;
    name: string;
    rdns: string;
    icon: string;
  };
  provider: EthereumProvider;
};

type ConnectLabState = {
  providerName: string;
  providerRdns: string;
  detected: boolean;
  accounts: string[];
  chainId: string;
  permissions: string;
  lastResult: string;
  lastError: string | null;
  multichain: Record<string, string>;
};

const DEFAULT_STATE: ConnectLabState = {
  providerName: "No injected wallet",
  providerRdns: "window.ethereum unavailable",
  detected: false,
  accounts: [],
  chainId: "",
  permissions: "Not requested",
  lastResult: "Open the extension, unlock it, then run a check.",
  lastError: null,
  multichain: {},
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    solana?: {
      isAcorus?: boolean;
      isPhantom?: boolean;
      publicKey?: { toString(): string } | null;
      supportedMethods?: Record<string, boolean>;
      capabilities?: Record<string, boolean>;
      connect?: () => Promise<unknown>;
      signMessage?: (message: string | Uint8Array) => Promise<unknown>;
      request?: (input: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
    tronLink?: {
      isAcorus?: boolean;
      ready?: boolean;
      request?: (input: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
    acorusBitcoin?: {
      connect?: () => Promise<unknown>;
      request?: (input: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
    acorusTon?: {
      connect?: () => Promise<unknown>;
      request?: (input: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export function ExtensionConnectLab() {
  const [provider, setProvider] = useState<EthereumProvider | null>(null);
  const [eip6963Providers, setEip6963Providers] = useState<Eip6963ProviderDetail[]>([]);
  const [state, setState] = useState<ConnectLabState>(DEFAULT_STATE);
  const [isBusy, setIsBusy] = useState(false);

  const activeProvider = provider ?? eip6963Providers[0]?.provider ?? null;
  const providerFlags = useMemo(() => {
    if (!activeProvider) return ["not detected"];

    return [
      activeProvider.isAcorus ? "isAcorus" : null,
      activeProvider.isMetaMask ? "isMetaMask-compatible" : null,
      activeProvider.isTrust ? "isTrust" : null,
    ].filter(Boolean) as string[];
  }, [activeProvider]);

  useEffect(() => {
    const discoveredProviders: Eip6963ProviderDetail[] = [];

    function handleAnnouncement(event: Event) {
      const customEvent = event as CustomEvent<Eip6963ProviderDetail>;
      const detail = customEvent.detail;

      if (!detail?.provider || !detail.info?.uuid) {
        return;
      }

      if (discoveredProviders.some((item) => item.info.uuid === detail.info.uuid)) {
        return;
      }

      discoveredProviders.push(detail);
      setEip6963Providers([...discoveredProviders]);
      setProvider((current) => current ?? detail.provider);
      setState((current) => ({
        ...current,
        detected: true,
        providerName: detail.info.name,
        providerRdns: detail.info.rdns,
        lastResult: "EIP-6963 provider announced and ready.",
      }));
    }

    window.addEventListener("eip6963:announceProvider", handleAnnouncement);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    if (window.ethereum) {
      setProvider(window.ethereum);
      setState((current) => ({
        ...current,
        detected: true,
        providerName: window.ethereum?.isAcorus ? "Acorus Wallet" : "Injected wallet",
        providerRdns: window.ethereum?.isAcorus ? "ru.24wallet.acorus" : "window.ethereum",
        lastResult: "window.ethereum is available.",
      }));
    }

    return () => {
      window.removeEventListener("eip6963:announceProvider", handleAnnouncement);
    };
  }, []);

  useEffect(() => {
    if (!activeProvider?.on) {
      return;
    }

    function handleAccountsChanged(nextAccounts: unknown) {
      setState((current) => ({
        ...current,
        accounts: Array.isArray(nextAccounts)
          ? nextAccounts.filter((account): account is string => typeof account === "string")
          : current.accounts,
      }));
    }

    function handleChainChanged(nextChainId: unknown) {
      setState((current) => ({
        ...current,
        chainId: typeof nextChainId === "string" ? nextChainId : current.chainId,
      }));
    }

    activeProvider.on("accountsChanged", handleAccountsChanged);
    activeProvider.on("chainChanged", handleChainChanged);

    return () => {
      activeProvider.removeListener?.("accountsChanged", handleAccountsChanged);
      activeProvider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [activeProvider]);

  async function runProviderCall<T>(
    label: string,
    args: EthereumRequestArgs,
    onSuccess?: (result: T) => Partial<ConnectLabState>,
  ) {
    if (!activeProvider) {
      setState((current) => ({
        ...current,
        lastError: "Injected provider was not detected. Reload the page after enabling Acorus.",
      }));
      return;
    }

    setIsBusy(true);
    setState((current) => ({ ...current, lastError: null, lastResult: `${label}...` }));

    try {
      const result = await activeProvider.request<T>(args);
      setState((current) => ({
        ...current,
        ...(onSuccess?.(result) ?? {}),
        lastResult: `${label}: ${formatResult(result)}`,
        lastError: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        lastError: error instanceof Error ? error.message : `${label} failed.`,
        lastResult: `${label} rejected or failed.`,
      }));
    } finally {
      setIsBusy(false);
    }
  }

  async function refreshStatus() {
    await runProviderCall<string[]>("eth_accounts", { method: "eth_accounts" }, (accounts) => ({
      accounts,
    }));
    await runProviderCall<string>("eth_chainId", { method: "eth_chainId" }, (chainId) => ({
      chainId,
    }));
  }

  async function connectWallet() {
    await runProviderCall<string[]>(
      "eth_requestAccounts",
      { method: "eth_requestAccounts" },
      (accounts) => ({ accounts }),
    );
  }

  async function readPermissions() {
    await runProviderCall<unknown[]>(
      "wallet_getPermissions",
      { method: "wallet_getPermissions" },
      (permissions) => ({ permissions: formatResult(permissions) }),
    );
  }

  async function switchToPolygon() {
    await runProviderCall("wallet_switchEthereumChain", {
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x89" }],
    });
  }

  async function addBaseNetwork() {
    await runProviderCall("wallet_addEthereumChain", {
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0x2105",
          chainName: "Base",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://mainnet.base.org"],
          blockExplorerUrls: ["https://basescan.org"],
        },
      ],
    });
  }

  async function signProbeMessage() {
    const account = state.accounts[0];

    if (!account) {
      setState((current) => ({
        ...current,
        lastError: "Connect an account first, then run personal_sign.",
      }));
      return;
    }

    await runProviderCall<string>("personal_sign", {
      method: "personal_sign",
      params: ["Acorus Wallet dApp compatibility check", account],
    });
  }

  async function detectMultichainProviders() {
    setState((current) => ({
      ...current,
      multichain: {
        EVM: window.ethereum ? "window.ethereum detected" : "missing",
        Solana: window.solana ? "window.solana detected" : "missing",
        Tron: window.tronLink ? "window.tronLink detected" : "missing",
        Bitcoin: window.acorusBitcoin ? "window.acorusBitcoin detected" : "missing",
        TON: window.acorusTon ? "window.acorusTon detected" : "missing",
      },
      lastResult: "Multichain provider surfaces checked.",
      lastError: null,
    }));
  }

  async function connectSolana() {
    await runGenericProviderCall("Solana connect", () =>
      window.solana?.connect?.()
      ?? window.solana?.request?.({ method: "solana_connect" })
      ?? Promise.reject(new Error("window.solana is unavailable.")),
    );
  }

  async function connectTron() {
    await runGenericProviderCall("Tron connect", () =>
      window.tronLink?.request?.({ method: "tron_requestAccounts" })
      ?? Promise.reject(new Error("window.tronLink is unavailable.")),
    );
  }

  async function connectBitcoin() {
    await runGenericProviderCall("Bitcoin connect", () =>
      window.acorusBitcoin?.connect?.()
      ?? Promise.reject(new Error("window.acorusBitcoin is unavailable.")),
    );
  }

  async function connectTon() {
    await runGenericProviderCall("TON connect", () =>
      window.acorusTon?.connect?.()
      ?? Promise.reject(new Error("window.acorusTon is unavailable.")),
    );
  }

  async function runGenericProviderCall(label: string, call: () => Promise<unknown>) {
    setIsBusy(true);
    setState((current) => ({ ...current, lastError: null, lastResult: `${label}...` }));

    try {
      const result = await call();
      setState((current) => ({
        ...current,
        lastResult: `${label}: ${formatResult(result)}`,
        lastError: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        lastResult: `${label} rejected or failed.`,
        lastError: error instanceof Error ? error.message : `${label} failed.`,
      }));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="premium-card grid gap-5 p-5 lg:grid-cols-[0.9fr,1.1fr]">
      <div className="space-y-4">
        <span className="section-kicker">Live dApp compatibility</span>
        <div>
          <h2 className="text-2xl font-semibold text-white">Extension connect lab</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Проверка идет через тот же injected provider, который видят Uniswap,
            PancakeSwap и другие dApp. Если здесь проходит connect, chainId,
            permissions и подпись, значит сайтовая интеграция работает как
            настоящий кошелек.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <LabMetric label="Provider" value={state.providerName} />
          <LabMetric label="Network" value={state.chainId || "Not read"} />
          <LabMetric label="Accounts" value={String(state.accounts.length)} />
          <LabMetric label="Registry" value={`${eip6963Providers.length} EIP-6963`} />
        </div>

        <div className="flex flex-wrap gap-2">
          {providerFlags.map((flag) => (
            <span
              key={flag}
              className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-slate-200"
            >
              {flag}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-[1.65rem] border border-white/10 bg-slate-950/55 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <LabButton disabled={isBusy} label="Detect status" onClick={() => void refreshStatus()} />
          <LabButton disabled={isBusy} label="Connect wallet" onClick={() => void connectWallet()} primary />
          <LabButton disabled={isBusy} label="Read permissions" onClick={() => void readPermissions()} />
          <LabButton disabled={isBusy} label="Switch Polygon" onClick={() => void switchToPolygon()} />
          <LabButton disabled={isBusy} label="Add Base" onClick={() => void addBaseNetwork()} />
          <LabButton disabled={isBusy} label="Sign message" onClick={() => void signProbeMessage()} primary />
          <LabButton disabled={isBusy} label="Detect multichain" onClick={() => void detectMultichainProviders()} />
          <LabButton disabled={isBusy} label="Connect Solana" onClick={() => void connectSolana()} />
          <LabButton disabled={isBusy} label="Connect Tron" onClick={() => void connectTron()} />
          <LabButton disabled={isBusy} label="Connect Bitcoin" onClick={() => void connectBitcoin()} />
          <LabButton disabled={isBusy} label="Connect TON" onClick={() => void connectTon()} />
        </div>

        <div className="mt-4 space-y-3">
          <ResultBox label="Origin" value={typeof window === "undefined" ? "" : window.location.origin} />
          <ResultBox label="Provider rdns" value={state.providerRdns} />
          <ResultBox label="Accounts" value={state.accounts.join(", ") || "No exposed accounts"} />
          <ResultBox label="Permissions" value={state.permissions} />
          <ResultBox
            label="Multichain providers"
            value={
              Object.entries(state.multichain)
                .map(([family, status]) => `${family}: ${status}`)
                .join("\n") || "Not checked"
            }
          />
          <ResultBox label="Last result" value={state.lastResult} />
          {state.lastError ? (
            <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-100">
              {state.lastError}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function LabMetric(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{props.label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{props.value}</p>
    </div>
  );
}

function LabButton(props: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={props.primary ? "button-primary px-4 py-3 text-sm" : "button-secondary px-4 py-3 text-sm"}
    >
      {props.label}
    </button>
  );
}

function ResultBox(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{props.label}</p>
      <p className="mt-1 break-words text-slate-200">{props.value}</p>
    </div>
  );
}

function formatResult(result: unknown): string {
  if (typeof result === "string") return result;

  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

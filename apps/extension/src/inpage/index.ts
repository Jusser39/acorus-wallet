import type { DappBridgeSessionView } from "@acorus/shared";
import {
  coerceEvmAccounts,
  formatEvmChainId,
  getEvmSelectedAccount,
  isEvmCompatibilityMethod,
  mapEvmMethodToAcorusMethod,
  normalizeEvmRequestParams,
  parseEvmSwitchChainParameter,
  toNetVersion,
  type EvmCompatibilityMethod,
  type EvmJsonRpcRequest,
  type EvmJsonRpcResponse,
  type EvmProviderEventName,
  type EvmProviderListener,
  type EvmProviderRequestArguments,
} from "../shared/evm-compat";
import {
  ACORUS_INPAGE_REQUEST,
  ACORUS_INPAGE_RESPONSE,
  createRequestId,
  isAcorusProviderMethod,
  isInpageStateEnvelope,
  type InpageStateEnvelope,
  type InpageRequestEnvelope,
  type InpageResponseEnvelope,
} from "../shared/protocol";

type EvmLegacyCallback = (
  error: Error | null,
  response: EvmJsonRpcResponse,
) => void;

type AcorusEthereumProvider = {
  readonly isAcorus: true;
  readonly isMetaMask: true;
  readonly isTrust: false;
  readonly providers: AcorusEthereumProvider[];
  readonly chainId: string | null;
  readonly selectedAddress: string | null;
  isConnected(): boolean;
  request(args: EvmProviderRequestArguments): Promise<unknown>;
  send(
    methodOrPayload: string | EvmJsonRpcRequest,
    paramsOrCallback?:
      | unknown[]
      | Record<string, unknown>
      | EvmLegacyCallback,
  ): Promise<unknown> | void;
  sendAsync(payload: EvmJsonRpcRequest, callback: EvmLegacyCallback): void;
  enable(): Promise<string[]>;
  on(
    event: EvmProviderEventName,
    listener: EvmProviderListener,
  ): AcorusEthereumProvider;
  removeListener(
    event: EvmProviderEventName,
    listener: EvmProviderListener,
  ): AcorusEthereumProvider;
};

declare global {
  interface Window {
    acorus?: {
      isAcorus: true;
      providers: AcorusMultichainProviders;
      isConnected(): boolean;
      request(input: { method: string; params?: unknown[] }): Promise<unknown>;
    };
    ethereum?: AcorusEthereumProvider;
    acorusEthereum?: AcorusEthereumProvider;
    solana?: AcorusSolanaProvider;
    acorusSolana?: AcorusSolanaProvider;
    tronLink?: AcorusTronProvider;
    acorusTron?: AcorusTronProvider;
    acorusBitcoin?: AcorusSimpleChainProvider;
    acorusTon?: AcorusSimpleChainProvider;
    acorusEthereumInjected?: boolean;
  }
}

type AcorusMultichainProviderFamily = "evm" | "solana" | "tron" | "utxo" | "ton";

type AcorusSimpleChainProvider = {
  readonly isAcorus: true;
  readonly family: AcorusMultichainProviderFamily;
  readonly chainId: string | number;
  connect(): Promise<{ publicKey?: string; address?: string; accounts: string[] }>;
  request(input: { method: string; params?: unknown[] }): Promise<unknown>;
};

type AcorusSolanaProvider = AcorusSimpleChainProvider & {
  readonly isPhantom: false;
  readonly supportedMethods: {
    readonly connect: true;
    readonly signMessage: true;
    readonly signTransaction: false;
    readonly signAndSendTransaction: false;
  };
  readonly capabilities: {
    readonly connect: true;
    readonly signMessage: true;
    readonly signTransaction: false;
    readonly signAndSendTransaction: false;
  };
  readonly publicKey: { toString(): string } | null;
  readonly isConnected: boolean;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array | string): Promise<unknown>;
};

type AcorusTronProvider = {
  readonly isAcorus: true;
  readonly ready: boolean;
  readonly request: (input: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type AcorusMultichainProviders = {
  evm: AcorusEthereumProvider;
  solana: AcorusSolanaProvider;
  tron: AcorusTronProvider;
  bitcoin: AcorusSimpleChainProvider;
  ton: AcorusSimpleChainProvider;
};

const pendingRequests = new Map<
  string,
  {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }
>();

let bridgeState: DappBridgeSessionView = {
  origin: window.location.origin,
  status: "disconnected",
  providerMode: "stub_only",
  accounts: [],
  chainIds: [],
  activeChainId: null,
  permissions: [],
  updatedAt: new Date().toISOString(),
};

const ACORUS_EIP6963_INFO = {
  uuid: "7e7f39e2-7b23-4f04-b3b9-acoruswallet01",
  name: "Acorus Wallet",
  icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%23ff46b7'/%3E%3Cstop offset='.55' stop-color='%238b5cf6'/%3E%3Cstop offset='1' stop-color='%2338bdf8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' rx='18' fill='url(%23g)'/%3E%3Cpath fill='white' d='M33 13 50 51h-9l-3-8H24l-3 8h-8L30 13h3Zm2 23-4-11-4 11h8Z'/%3E%3C/svg%3E",
  rdns: "ru.24wallet.acorus",
} as const;

window.addEventListener("message", handleInpageResponse);

function handleInpageResponse(event: MessageEvent<unknown>): void {
  if (event.source !== window) {
    return;
  }

  const data = event.data;

  if (isInpageStateEnvelope(data)) {
    applyBridgeState(data);
    return;
  }

  if (
    typeof data !== "object"
    || data === null
    || (data as Partial<InpageResponseEnvelope>).type !== ACORUS_INPAGE_RESPONSE
    || typeof (data as Partial<InpageResponseEnvelope>).requestId !== "string"
  ) {
    return;
  }

  const response = data as InpageResponseEnvelope;
  const pending = pendingRequests.get(response.requestId);

  if (!pending) {
    return;
  }

  pendingRequests.delete(response.requestId);

  if (response.ok) {
    pending.resolve(response.result);
    return;
  }

  pending.reject(
    createProviderError(
      response.error?.code ?? "provider_error",
      response.error?.message ?? "Acorus extension request failed.",
    ),
  );
}

function applyBridgeState(envelope: InpageStateEnvelope): void {
  const previous = bridgeState;
  bridgeState = envelope.state;

  window.dispatchEvent(
    new CustomEvent("acorus#stateChanged", {
      detail: bridgeState,
    }),
  );

  if (JSON.stringify(previous.accounts) !== JSON.stringify(bridgeState.accounts)) {
    window.dispatchEvent(
      new CustomEvent("acorus#accountsChanged", {
        detail: bridgeState.accounts,
      }),
    );
  }

  if (previous.activeChainId !== bridgeState.activeChainId) {
    window.dispatchEvent(
      new CustomEvent("acorus#chainChanged", {
        detail: bridgeState.activeChainId,
      }),
    );
  }

  emitEthereumStateChanges(previous, bridgeState);
}

function createProviderError(code: string, message: string): Error {
  const error = new Error(message);
  error.name = code;
  return error;
}

function requestBridgeMethod(
  method: InpageRequestEnvelope["method"],
  params: unknown[],
): Promise<unknown> {
  const requestId = createRequestId("inpage");
  const envelope: InpageRequestEnvelope = {
    type: ACORUS_INPAGE_REQUEST,
    requestId,
    method,
    params,
  };

  return new Promise((resolve, reject) => {
    pendingRequests.set(requestId, { resolve, reject });
    window.postMessage(envelope, window.location.origin);
  });
}

class AcorusEthereumProviderRuntime implements AcorusEthereumProvider {
  readonly isAcorus = true as const;
  readonly isMetaMask = true as const;
  readonly isTrust = false as const;
  readonly providers: AcorusEthereumProvider[] = [this];
  private readonly listeners = new Map<
    EvmProviderEventName,
    Set<EvmProviderListener>
  >();

  get chainId(): string | null {
    return formatEvmChainId(bridgeState.activeChainId);
  }

  get selectedAddress(): string | null {
    return bridgeState.accounts[0] ?? null;
  }

  isConnected(): boolean {
    return bridgeState.status === "connected";
  }

  async request(args: EvmProviderRequestArguments): Promise<unknown> {
    if (!isEvmCompatibilityMethod(args.method)) {
      throw createEthereumProviderError(
        4200,
        `Unsupported Ethereum provider method: ${args.method}.`,
      );
    }

    try {
      return await handleEvmCompatibilityRequest(args.method, args.params);
    } catch (error) {
      throw normalizeEthereumProviderError(error);
    }
  }

  send(
    methodOrPayload: string | EvmJsonRpcRequest,
    paramsOrCallback?:
      | unknown[]
      | Record<string, unknown>
      | EvmLegacyCallback,
  ): Promise<unknown> | void {
    if (typeof methodOrPayload === "string") {
      if (isLegacyCallback(paramsOrCallback)) {
        this.sendAsync(
          {
            id: createRequestId("ethereum"),
            jsonrpc: "2.0",
            method: methodOrPayload,
            params: [],
          },
          paramsOrCallback,
        );
        return;
      }

      return this.request({
        method: methodOrPayload,
        params: paramsOrCallback,
      });
    }

    if (isLegacyCallback(paramsOrCallback)) {
      this.sendAsync(methodOrPayload, paramsOrCallback);
      return;
    }

    return this.request({
      method: methodOrPayload.method,
      params: methodOrPayload.params,
    });
  }

  sendAsync(payload: EvmJsonRpcRequest, callback: EvmLegacyCallback): void {
    void this.request({
      method: payload.method,
      params: payload.params,
    })
      .then((result) => {
        callback(null, {
          id: payload.id ?? null,
          jsonrpc: "2.0",
          result,
        });
      })
      .catch((error) => {
        const providerError = normalizeEthereumProviderError(error);
        callback(providerError, {
          id: payload.id ?? null,
          jsonrpc: "2.0",
          error: {
            code: getEthereumProviderErrorCode(providerError),
            message: providerError.message,
          },
        });
      });
  }

  enable(): Promise<string[]> {
    return this.request({
      method: "eth_requestAccounts",
    }) as Promise<string[]>;
  }

  on(event: EvmProviderEventName, listener: EvmProviderListener): this {
    const listeners = this.listeners.get(event) ?? new Set<EvmProviderListener>();
    listeners.add(listener);
    this.listeners.set(event, listeners);
    return this;
  }

  removeListener(
    event: EvmProviderEventName,
    listener: EvmProviderListener,
  ): this {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  emit(event: EvmProviderEventName, ...args: unknown[]): void {
    const listeners = this.listeners.get(event);

    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      listener(...args);
    }
  }
}

const ethereumProvider = deepFreeze(new AcorusEthereumProviderRuntime());
const solanaProvider = deepFreeze(createSolanaProvider());
const tronProvider = deepFreeze(createTronProvider());
const bitcoinProvider = deepFreeze(createSimpleChainProvider("utxo", "bitcoin-mainnet"));
const tonProvider = deepFreeze(createSimpleChainProvider("ton", "ton-mainnet"));
const acorusProvider: NonNullable<Window["acorus"]> = deepFreeze({
  isAcorus: true,
  providers: {
    evm: ethereumProvider,
    solana: solanaProvider,
    tron: tronProvider,
    bitcoin: bitcoinProvider,
    ton: tonProvider,
  },
  isConnected() {
    return bridgeState.status === "connected";
  },
  async request(input: { method: string; params?: unknown[] }) {
    if (!isAcorusProviderMethod(input.method)) {
      throw new Error("Unsupported Acorus provider method.");
    }

    return requestBridgeMethod(input.method, input.params ?? []);
  },
});

Object.freeze(AcorusEthereumProviderRuntime.prototype);
defineImmutableWindowProperty("acorusEthereumInjected", true);
defineImmutableWindowProperty("ethereum", ethereumProvider);
defineImmutableWindowProperty("acorusEthereum", ethereumProvider);
defineImmutableWindowProperty("solana", solanaProvider);
defineImmutableWindowProperty("acorusSolana", solanaProvider);
defineImmutableWindowProperty("tronLink", tronProvider);
defineImmutableWindowProperty("acorusTron", tronProvider);
defineImmutableWindowProperty("acorusBitcoin", bitcoinProvider);
defineImmutableWindowProperty("acorusTon", tonProvider);
defineImmutableWindowProperty("acorus", acorusProvider);
window.dispatchEvent(new Event("acorus#initialized"));
window.dispatchEvent(new Event("ethereum#initialized"));
window.dispatchEvent(new Event("solana#initialized"));
window.dispatchEvent(new Event("tronLink#initialized"));
announceEip6963Provider();
window.addEventListener("eip6963:requestProvider", announceEip6963Provider);

function defineImmutableWindowProperty<K extends keyof Window>(
  property: K,
  value: Window[K],
): void {
  const descriptor = Object.getOwnPropertyDescriptor(window, property);

  if (descriptor && descriptor.configurable === false) {
    return;
  }

  Object.defineProperty(window, property, {
    value,
    enumerable: true,
    configurable: false,
    writable: false,
  });
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) {
    return value;
  }

  const objectValue = value as object;

  if (seen.has(objectValue)) {
    return value;
  }

  seen.add(objectValue);

  for (const key of Reflect.ownKeys(objectValue)) {
    const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);

    if (!descriptor || !("value" in descriptor)) {
      continue;
    }

    deepFreeze(descriptor.value, seen);
  }

  return Object.freeze(value);
}

async function handleEvmCompatibilityRequest(
  method: EvmCompatibilityMethod,
  paramsInput: EvmProviderRequestArguments["params"],
): Promise<unknown> {
  if (method === "wallet_switchEthereumChain") {
    const requestedChainId = parseEvmSwitchChainParameter(paramsInput);

    if (requestedChainId === null) {
      throw createEthereumProviderError(
        -32602,
        "wallet_switchEthereumChain expects a chainId field in the first parameter.",
      );
    }

    await requestBridgeMethod("acorus_switchChain", [requestedChainId]);
    return null;
  }

  const acorusMethod = mapEvmMethodToAcorusMethod(method);

  if (!acorusMethod) {
    throw createEthereumProviderError(
      4200,
      `Unsupported Ethereum provider method: ${method}.`,
    );
  }

  const result = await requestBridgeMethod(
    acorusMethod,
    shouldScopeEvmMethodToFamily(method)
      ? [{ family: "evm" }, ...normalizeEvmRequestParams(paramsInput)]
      : normalizeEvmRequestParams(paramsInput),
  );

  switch (method) {
    case "eth_requestAccounts":
    case "eth_accounts":
      return coerceEvmAccounts(result);
    case "eth_chainId": {
      const chainId = formatEvmChainId(result as DappBridgeSessionView["activeChainId"]);

      if (!chainId) {
        throw createEthereumProviderError(
          4900,
          "No active EVM chain is available for this origin.",
        );
      }

      return chainId;
    }
    case "web3_clientVersion":
      return "AcorusWallet/v0.1.0";
    case "wallet_getPermissions":
    case "wallet_requestPermissions":
      return Array.isArray(result)
        ? result.map((parentCapability) => ({ parentCapability }))
        : [];
    case "wallet_revokePermissions":
    case "wallet_addEthereumChain":
      return null;
    case "wallet_watchAsset":
      return Boolean(result);
    case "net_version": {
      const chainId = toNetVersion(result as DappBridgeSessionView["activeChainId"]);

      if (!chainId) {
        throw createEthereumProviderError(
          4900,
          "No active EVM chain is available for this origin.",
        );
      }

      return chainId;
    }
    case "eth_coinbase":
      return getEvmSelectedAccount(result);
    case "personal_sign":
    case "eth_signTypedData_v4":
    case "eth_signTransaction":
    case "eth_sendTransaction":
      return result;
    default:
      return result;
  }
}

function emitEthereumStateChanges(
  previous: DappBridgeSessionView,
  next: DappBridgeSessionView,
): void {
  const previousChainId = formatEvmChainId(previous.activeChainId);
  const nextChainId = formatEvmChainId(next.activeChainId);
  const wasConnected = previous.status === "connected";
  const isConnected = next.status === "connected";

  if (JSON.stringify(previous.accounts) !== JSON.stringify(next.accounts)) {
    ethereumProvider.emit("accountsChanged", next.accounts);
  }

  if (previousChainId !== nextChainId && nextChainId) {
    ethereumProvider.emit("chainChanged", nextChainId);
  }

  if (!wasConnected && isConnected) {
    ethereumProvider.emit("connect", {
      chainId: nextChainId ?? "0x0",
    });
  }

  if (wasConnected && !isConnected) {
    ethereumProvider.emit(
      "disconnect",
      createEthereumProviderError(
        4900,
        "Acorus Wallet disconnected from this origin.",
      ),
    );
  }
}

function shouldScopeEvmMethodToFamily(method: EvmCompatibilityMethod): boolean {
  return (
    method === "eth_requestAccounts"
    || method === "eth_accounts"
    || method === "eth_coinbase"
    || method === "wallet_requestPermissions"
  );
}

function createSolanaProvider(): AcorusSolanaProvider {
  const provider: AcorusSolanaProvider = {
    isAcorus: true,
    isPhantom: false,
    supportedMethods: {
      connect: true,
      signMessage: true,
      signTransaction: false,
      signAndSendTransaction: false,
    },
    capabilities: {
      connect: true,
      signMessage: true,
      signTransaction: false,
      signAndSendTransaction: false,
    },
    family: "solana",
    chainId: 101,
    get publicKey() {
      const account = bridgeState.accounts.find((value) => !value.startsWith("0x"));
      return account
        ? {
            toString() {
              return account;
            },
          }
        : null;
    },
    get isConnected() {
      return Boolean(this.publicKey);
    },
    async connect() {
      const accounts = await requestFamilyAccounts("solana");
      window.dispatchEvent(new CustomEvent("acorusSolana#connect", {
        detail: { publicKey: accounts[0] ?? null },
      }));
      return {
        publicKey: accounts[0],
        address: accounts[0],
        accounts,
      };
    },
    async disconnect() {
      await requestBridgeMethod("acorus_revokePermissions", []);
      window.dispatchEvent(new Event("acorusSolana#disconnect"));
    },
    async signMessage(message) {
      return requestBridgeMethod("acorus_signMessage", [
        {
          family: "solana",
          message: typeof message === "string" ? message : Array.from(message),
        },
      ]);
    },
    async request(input) {
      if (input.method === "connect" || input.method === "solana_connect") {
        return this.connect();
      }

      if (input.method === "disconnect" || input.method === "solana_disconnect") {
        return this.disconnect();
      }

      if (input.method === "signMessage" || input.method === "solana_signMessage") {
        return this.signMessage((input.params ?? [])[0] as Uint8Array | string);
      }

      return requestBridgeMethod("acorus_requestAccounts", [{ family: "solana" }]);
    },
  };

  return provider;
}

function createTronProvider(): AcorusTronProvider {
  return {
    isAcorus: true,
    get ready() {
      return bridgeState.status === "connected";
    },
    async request(input) {
      if (
        input.method === "tron_requestAccounts"
        || input.method === "request_accounts"
        || input.method === "connect"
      ) {
        return {
          code: 200,
          message: "OK",
          accounts: await requestFamilyAccounts("tron"),
        };
      }

      if (input.method === "tron_signMessage") {
        return requestBridgeMethod("acorus_signMessage", [
          {
            family: "tron",
            message: (input.params ?? [])[0],
          },
        ]);
      }

      return requestBridgeMethod("acorus_requestAccounts", [{ family: "tron" }]);
    },
  };
}

function createSimpleChainProvider(
  family: "utxo" | "ton",
  chainId: string,
): AcorusSimpleChainProvider {
  return {
    isAcorus: true,
    family,
    chainId,
    async connect() {
      const accounts = await requestFamilyAccounts(family);
      return {
        address: accounts[0],
        accounts,
      };
    },
    async request(input) {
      if (input.method === "connect" || input.method.endsWith("_requestAccounts")) {
        return this.connect();
      }

      if (input.method.toLowerCase().includes("sign")) {
        return requestBridgeMethod("acorus_signMessage", [
          {
            family,
            payload: input.params ?? [],
          },
        ]);
      }

      return requestBridgeMethod("acorus_accounts", [{ family }]);
    },
  };
}

async function requestFamilyAccounts(
  family: AcorusMultichainProviderFamily,
): Promise<string[]> {
  const accounts = await requestBridgeMethod("acorus_requestAccounts", [{ family }]);
  return Array.isArray(accounts)
    ? accounts.filter((account): account is string => typeof account === "string")
    : [];
}

function announceEip6963Provider(): void {
  window.dispatchEvent(
    new CustomEvent("eip6963:announceProvider", {
      detail: {
        info: ACORUS_EIP6963_INFO,
        provider: ethereumProvider,
      },
    }),
  );
}

function normalizeEthereumProviderError(error: unknown): Error & { code: number } {
  if (error instanceof Error && getEthereumProviderErrorCode(error) !== -32603) {
    return error as Error & { code: number };
  }

  if (error instanceof Error) {
    return createEthereumProviderError(
      mapAcorusErrorCode(error.name),
      error.message,
    );
  }

  return createEthereumProviderError(
    -32603,
    "Ethereum provider request failed.",
  );
}

function createEthereumProviderError(
  code: number,
  message: string,
): Error & { code: number } {
  const error = new Error(message) as Error & { code: number };
  error.code = code;
  return error;
}

function getEthereumProviderErrorCode(error: Error): number {
  const code = (error as { code?: unknown }).code;
  return typeof code === "number" ? code : -32603;
}

function mapAcorusErrorCode(code: string): number {
  switch (code) {
    case "user_rejected":
      return 4001;
    case "approval_required":
    case "permission_denied":
      return 4100;
    case "unsupported_method":
    case "not_enabled":
      return 4200;
    case "not_connected":
    case "session_revoked":
    case "wallet_locked":
      return 4900;
    case "unsupported_chain":
      return 4902;
    case "bad_request":
      return -32602;
    default:
      return -32603;
  }
}

function isLegacyCallback(value: unknown): value is EvmLegacyCallback {
  return typeof value === "function";
}

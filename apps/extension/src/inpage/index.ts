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
  readonly isMetaMask: false;
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
      isConnected(): boolean;
      request(input: { method: string; params?: unknown[] }): Promise<unknown>;
    };
    ethereum?: AcorusEthereumProvider;
    acorusEthereum?: AcorusEthereumProvider;
  }
}

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

window.addEventListener("message", handleInpageResponse);

window.acorus = {
  isAcorus: true,
  isConnected() {
    return bridgeState.status === "connected";
  },
  async request(input) {
    if (!isAcorusProviderMethod(input.method)) {
      throw new Error("Unsupported Acorus provider method.");
    }

    return requestBridgeMethod(input.method, input.params ?? []);
  },
};

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
  readonly isMetaMask = false as const;
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

const ethereumProvider = new AcorusEthereumProviderRuntime();
window.ethereum = ethereumProvider;
window.acorusEthereum = ethereumProvider;
window.dispatchEvent(new Event("acorus#initialized"));
window.dispatchEvent(new Event("ethereum#initialized"));

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
    normalizeEvmRequestParams(paramsInput),
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

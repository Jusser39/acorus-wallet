import {
  ACORUS_INPAGE_REQUEST,
  ACORUS_INPAGE_RESPONSE,
  createRequestId,
  isInpageStateEnvelope,
  isAcorusProviderMethod,
  type InpageStateEnvelope,
  type InpageRequestEnvelope,
  type InpageResponseEnvelope,
} from "../shared/protocol";
import type { DappBridgeSessionView } from "@acorus/shared";

declare global {
  interface Window {
    acorus?: {
      isAcorus: true;
      isConnected(): boolean;
      request(input: { method: string; params?: unknown[] }): Promise<unknown>;
    };
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

    const requestId = createRequestId("inpage");
    const envelope: InpageRequestEnvelope = {
      type: ACORUS_INPAGE_REQUEST,
      requestId,
      method: input.method,
      params: input.params ?? [],
    };

    return new Promise((resolve, reject) => {
      pendingRequests.set(requestId, { resolve, reject });
      window.postMessage(envelope, window.location.origin);
    });
  },
};

window.dispatchEvent(new Event("acorus#initialized"));

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
}

function createProviderError(code: string, message: string): Error {
  const error = new Error(message);
  error.name = code;
  return error;
}

import {
  ACORUS_INPAGE_REQUEST,
  ACORUS_INPAGE_RESPONSE,
  createRequestId,
  isAcorusProviderMethod,
  type InpageRequestEnvelope,
  type InpageResponseEnvelope,
} from "../shared/protocol";

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

window.addEventListener("message", handleInpageResponse);

window.acorus = {
  isAcorus: true,
  isConnected() {
    return false;
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
    new Error(response.error?.message ?? "Acorus extension request failed."),
  );
}

import {
  ACORUS_INPAGE_RESPONSE,
  ACORUS_INPAGE_STATE,
  createRequestId,
  isInpageRequestEnvelope,
  type BackgroundStateSnapshot,
  type ExtensionRuntimeResponse,
  type InpageResponseEnvelope,
  type InpageStateEnvelope,
} from "../shared/protocol";
import {
  isDappWalletSyncEnvelope,
  type DappWalletSyncEnvelope,
} from "@acorus/shared";

const TRUSTED_WALLET_SYNC_ORIGINS = new Set([
  "http://85.239.59.199:8080",
  "http://24wallet.ru",
  "https://24wallet.ru",
  "http://www.24wallet.ru",
  "https://www.24wallet.ru",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

window.addEventListener("message", handleWindowMessage);
chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName === "local") {
    void syncOriginState();
  }
});
void syncOriginState();

function handleWindowMessage(event: MessageEvent<unknown>): void {
  if (event.source !== window) {
    return;
  }

  if (isInpageRequestEnvelope(event.data)) {
    const request = event.data;

    void chrome.runtime
      .sendMessage({
        kind: "provider_request",
        requestId: request.requestId,
        surface: "content",
        origin: window.location.origin,
        method: request.method,
        params: request.params ?? [],
      })
      .then((response) => {
        postInpageResponse(request.requestId, response as ExtensionRuntimeResponse);
        return syncOriginState();
      })
      .catch((error) => {
        const response: InpageResponseEnvelope = {
          type: ACORUS_INPAGE_RESPONSE,
          requestId: request.requestId,
          ok: false,
          error: {
            code: "bridge_error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to route the Acorus extension message.",
          },
        };

        window.postMessage(response, window.location.origin);
      });

    return;
  }

  if (!isTrustedWalletSyncEnvelope(event.data)) {
    return;
  }

  void chrome.runtime.sendMessage({
    kind: "sync_wallet_profiles",
    requestId: createRequestId("wallet_sync"),
    surface: "content",
    origin: window.location.origin,
    payload: event.data,
  }).then(() => syncOriginState()).catch(() => {
    // ignore sync failures so the page does not leak extension internals
  });
}

function postInpageResponse(
  requestId: string,
  response: ExtensionRuntimeResponse,
): void {
  const payload: InpageResponseEnvelope = {
    type: ACORUS_INPAGE_RESPONSE,
    requestId,
    ok: response.ok,
    result: response.result,
    error: response.error,
  };

  window.postMessage(payload, window.location.origin);
}

async function syncOriginState(): Promise<void> {
  try {
    const response = (await chrome.runtime.sendMessage({
      kind: "get_state",
      requestId: createRequestId("content"),
      surface: "content",
      origin: window.location.origin,
    })) as ExtensionRuntimeResponse;

    if (!response.ok || !response.result) {
      return;
    }

    const state = response.result as BackgroundStateSnapshot;

    if (!state.activeOriginBridge) {
      return;
    }

    const payload: InpageStateEnvelope = {
      type: ACORUS_INPAGE_STATE,
      state: state.activeOriginBridge,
    };

    window.postMessage(payload, window.location.origin);
  } catch {
    // ignore bridge sync failures in content script; request path still reports errors explicitly
  }
}

function isTrustedWalletSyncEnvelope(
  value: unknown,
): value is DappWalletSyncEnvelope {
  return (
    TRUSTED_WALLET_SYNC_ORIGINS.has(window.location.origin)
    && isDappWalletSyncEnvelope(value)
  );
}

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

const INPAGE_SCRIPT_ID = "acorus-extension-inpage";

injectInpageProvider();
window.addEventListener("message", handleWindowMessage);
chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName === "local") {
    void syncOriginState();
  }
});
void syncOriginState();

function injectInpageProvider(): void {
  if (document.getElementById(INPAGE_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement("script");
  script.id = INPAGE_SCRIPT_ID;
  script.type = "module";
  script.src = chrome.runtime.getURL("inpage/index.js");
  script.async = false;
  (document.head ?? document.documentElement).appendChild(script);
}

function handleWindowMessage(event: MessageEvent<unknown>): void {
  if (event.source !== window || !isInpageRequestEnvelope(event.data)) {
    return;
  }

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

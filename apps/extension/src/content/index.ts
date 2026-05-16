import {
  ACORUS_INPAGE_REQUEST,
  ACORUS_INPAGE_RESPONSE,
  isInpageRequestEnvelope,
  type ExtensionRuntimeResponse,
  type InpageResponseEnvelope,
} from "../shared/protocol";

const INPAGE_SCRIPT_ID = "acorus-extension-inpage";

injectInpageProvider();
window.addEventListener("message", handleWindowMessage);

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

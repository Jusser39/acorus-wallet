import {
  createRequestId,
  isAcorusProviderMethod,
  type ExtensionRuntimeMessage,
} from "../shared/protocol";

const MAX_JSON_DEPTH = 18;
const MAX_JSON_STRING_LENGTH = 100_000;
const ALLOWED_PAGE_PROTOCOLS = new Set(["http:", "https:", "chrome-extension:"]);

type RuntimeMessageValidation =
  | {
      ok: true;
      message: ExtensionRuntimeMessage;
    }
  | {
      ok: false;
      requestId: string;
      code: string;
      message: string;
    };

/**
 * Validates and narrows a runtime message before wallet code handles it.
 *
 * SECURITY: Manifest V3 content scripts are an isolation boundary, not a trust
 * boundary. This validator rejects forged external messages, non-JSON payloads,
 * mismatched page origins, and unsupported provider methods before they can
 * touch permission queues or signing flows.
 */
export function validateRuntimeMessage(
  rawMessage: unknown,
  sender: chrome.MessageSender,
  extensionId: string,
): RuntimeMessageValidation {
  const fallbackRequestId = createRequestId("background");

  if (!isJsonRecord(rawMessage)) {
    return reject(fallbackRequestId, "bad_request", "Unknown extension message.");
  }

  const requestId = typeof rawMessage.requestId === "string"
    ? rawMessage.requestId.slice(0, 160)
    : fallbackRequestId;

  if (sender.id && sender.id !== extensionId) {
    return reject(requestId, "unauthorized_sender", "The extension message sender is not Acorus Wallet.");
  }

  if (typeof rawMessage.kind !== "string" || typeof rawMessage.surface !== "string") {
    return reject(requestId, "bad_request", "Extension messages require kind and surface.");
  }

  if (!isJsonSerializable(rawMessage)) {
    return reject(requestId, "bad_request", "Extension messages must be JSON-serializable.");
  }

  if (rawMessage.surface === "content") {
    const claimedOrigin = typeof rawMessage.origin === "string" ? rawMessage.origin : null;
    const senderOrigin = sanitizeMessageSenderOrigin(sender.url ?? sender.origin ?? null);

    if (!claimedOrigin || !senderOrigin) {
      return reject(requestId, "bad_origin", "Page-originated messages require a verified origin.");
    }

    if (claimedOrigin !== senderOrigin) {
      return reject(requestId, "origin_mismatch", "The message origin does not match the sender URL.");
    }
  }

  if (rawMessage.kind === "provider_request") {
    if (rawMessage.surface !== "content") {
      return reject(requestId, "bad_surface", "Provider requests must originate from the content script.");
    }

    if (typeof rawMessage.method !== "string" || !isAcorusProviderMethod(rawMessage.method)) {
      return reject(requestId, "unsupported_method", "Unsupported Acorus provider method.");
    }

    if (rawMessage.params !== undefined && !Array.isArray(rawMessage.params)) {
      return reject(requestId, "bad_params", "Provider request params must be an array.");
    }
  }

  return {
    ok: true,
    message: rawMessage as ExtensionRuntimeMessage,
  };
}

export function sanitizeMessageSenderOrigin(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);

    if (!ALLOWED_PAGE_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

function reject(
  requestId: string,
  code: string,
  message: string,
): RuntimeMessageValidation {
  return {
    ok: false,
    requestId,
    code,
    message,
  };
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object"
    && value !== null
    && !Array.isArray(value)
  );
}

function isJsonSerializable(value: unknown, depth = 0): boolean {
  if (depth > MAX_JSON_DEPTH) {
    return false;
  }

  if (value === null) {
    return true;
  }

  const valueType = typeof value;

  if (typeof value === "string") {
    return value.length <= MAX_JSON_STRING_LENGTH;
  }

  if (valueType === "number") {
    return Number.isFinite(value);
  }

  if (valueType === "boolean") {
    return true;
  }

  if (
    valueType === "undefined"
    || valueType === "function"
    || valueType === "symbol"
    || valueType === "bigint"
  ) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.every((entry) => isJsonSerializable(entry, depth + 1));
  }

  if (!isJsonRecord(value)) {
    return false;
  }

  return Object.entries(value).every(([key, entry]) => (
    key.length <= 256
    && isJsonSerializable(entry, depth + 1)
  ));
}

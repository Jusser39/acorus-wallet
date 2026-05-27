import type {
  ExtensionRuntimeMessage,
  InpageRequestEnvelope,
} from "./shared/protocol";

const MAX_BRIDGE_DEPTH = 18;
const MAX_BRIDGE_STRING_LENGTH = 100_000;
const ALLOWED_ORIGIN_PROTOCOLS = new Set(["http:", "https:"]);

type SanitizedBridgeRequest =
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
 * Builds the only runtime message shape accepted from the page bridge.
 *
 * SECURITY: dApps can run arbitrary JavaScript in their own page. The content
 * script must never forward prototypes, functions, accessors, or over-sized
 * strings into extension internals. This function clones through JSON after a
 * bounded traversal so the service worker sees plain data only.
 */
export function createSanitizedProviderRequest(
  request: InpageRequestEnvelope,
  origin: string,
): SanitizedBridgeRequest {
  const sanitizedOrigin = sanitizePageOrigin(origin);

  if (!sanitizedOrigin) {
    return {
      ok: false,
      requestId: request.requestId,
      code: "bad_origin",
      message: "Acorus Wallet only accepts provider requests from web origins.",
    };
  }

  const params = request.params ?? [];

  if (!Array.isArray(params) || !isJsonSerializable(params)) {
    return {
      ok: false,
      requestId: request.requestId,
      code: "bad_params",
      message: "Provider request params must be JSON-serializable.",
    };
  }

  return {
    ok: true,
    message: {
      kind: "provider_request",
      requestId: request.requestId.slice(0, 160),
      surface: "content",
      origin: sanitizedOrigin,
      method: request.method,
      params: cloneJson(params),
    },
  };
}

export function sanitizePageOrigin(origin: string): string | null {
  try {
    const parsed = new URL(origin);

    if (!ALLOWED_ORIGIN_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isJsonSerializable(value: unknown, depth = 0): boolean {
  if (depth > MAX_BRIDGE_DEPTH) {
    return false;
  }

  if (value === null) {
    return true;
  }

  const valueType = typeof value;

  if (typeof value === "string") {
    return value.length <= MAX_BRIDGE_STRING_LENGTH;
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

  if (typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const prototype = Object.getPrototypeOf(record);

  if (prototype !== Object.prototype && prototype !== null) {
    return false;
  }

  return Object.entries(record).every(([key, entry]) => (
    key.length <= 256
    && isJsonSerializable(entry, depth + 1)
  ));
}

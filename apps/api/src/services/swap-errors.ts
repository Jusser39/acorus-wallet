export class SwapProviderError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function safeProviderMessage(payload: Record<string, unknown>, fallback: string): string {
  return (
    readString(payload.message)
    ?? readString(payload.error)
    ?? readString(payload.description)
    ?? fallback
  );
}

export function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function normalizeRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : {};
}

export function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }

  return null;
}

export function createRateLimiter(limitPerMinute: number) {
  const requestTimestamps = new Map<string, number[]>();

  return (clientKey: string): void => {
    const now = Date.now();
    const windowStart = now - 60_000;
    const current = (requestTimestamps.get(clientKey) ?? []).filter(
      (timestamp) => timestamp > windowStart,
    );

    if (current.length >= limitPerMinute) {
      throw new SwapProviderError(429, "swap_rate_limited", "Too many swap quote requests.");
    }

    current.push(now);
    requestTimestamps.set(clientKey, current);
  };
}

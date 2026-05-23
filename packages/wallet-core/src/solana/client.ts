import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";

export const DEFAULT_SOLANA_RPC_TIMEOUT_MS = 8_000;
export const DEFAULT_SOLANA_RPC_URLS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-rpc.publicnode.com",
] as const;

export function createSolanaConnection(
  rpcUrl?: string,
  input?: {
    timeoutMs?: number;
  },
): Connection {
  const timeoutMs = input?.timeoutMs ?? DEFAULT_SOLANA_RPC_TIMEOUT_MS;

  return new Connection(rpcUrl || clusterApiUrl("mainnet-beta"), {
    commitment: "confirmed",
    fetch: createTimeoutFetch(timeoutMs),
  });
}

export function createSolanaConnections(
  rpcUrl?: string,
  input?: {
    timeoutMs?: number;
  },
): Connection[] {
  const urls = Array.from(
    new Set([
      rpcUrl,
      ...DEFAULT_SOLANA_RPC_URLS,
      clusterApiUrl("mainnet-beta"),
    ].filter((value): value is string => Boolean(value))),
  );

  return urls.map((url) => createSolanaConnection(url, input));
}

export function toSolanaPublicKey(address: string): PublicKey {
  return new PublicKey(address);
}

export function validateSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address.trim());
    return true;
  } catch {
    return false;
  }
}

export function formatSolanaRpcError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/403|access forbidden|forbidden/iu.test(message)) {
    return "Solana RPC access is temporarily blocked by the selected provider. Acorus tried public fallback RPCs; try again later or set another Solana RPC.";
  }

  if (/abort|timeout|timed out/iu.test(message)) {
    return "Solana RPC timed out. Try again or switch to another Solana RPC.";
  }

  return message || "Solana RPC is unavailable.";
}

function createTimeoutFetch(timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(input, {
        ...init,
        signal: init?.signal ?? controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}

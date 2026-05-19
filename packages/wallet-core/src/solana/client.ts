import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";

export const DEFAULT_SOLANA_RPC_TIMEOUT_MS = 8_000;

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

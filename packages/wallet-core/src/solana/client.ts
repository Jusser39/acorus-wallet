import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";

export function createSolanaConnection(rpcUrl?: string): Connection {
  return new Connection(rpcUrl || clusterApiUrl("mainnet-beta"), {
    commitment: "confirmed",
  });
}

export function toSolanaPublicKey(address: string): PublicKey {
  return new PublicKey(address);
}

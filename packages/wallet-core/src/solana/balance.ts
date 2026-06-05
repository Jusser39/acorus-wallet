import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  createSolanaConnections,
  formatSolanaRpcError,
  toSolanaPublicKey,
} from "./client";

export type SolanaNativeBalance = {
  lamports: string;
  sol: string;
};

export async function getSolanaNativeBalance(input: {
  address: string;
  rpcUrl?: string;
}): Promise<SolanaNativeBalance> {
  const publicKey = toSolanaPublicKey(input.address);
  let lastError: unknown = null;

  for (const connection of createSolanaConnections(input.rpcUrl)) {
    try {
      const lamports = await Promise.race([
        connection.getBalance(publicKey, "confirmed"),
        new Promise<number>((_, reject) => setTimeout(() => reject(new Error("Solana RPC Timeout")), 5000))
      ]);

      return {
        lamports: lamports.toString(),
        sol: (lamports / LAMPORTS_PER_SOL).toString(),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(formatSolanaRpcError(lastError));
}

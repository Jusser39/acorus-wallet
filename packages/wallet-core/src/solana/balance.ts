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
  const connections = createSolanaConnections(input.rpcUrl);

  try {
    const lamports = await Promise.any(
      connections.map((connection) =>
        Promise.race([
          connection.getBalance(publicKey, "confirmed"),
          new Promise<number>((_, reject) =>
            setTimeout(() => reject(new Error("Solana RPC Timeout")), 2000)
          ),
        ])
      )
    );

    return {
      lamports: lamports.toString(),
      sol: (lamports / LAMPORTS_PER_SOL).toString(),
    };
  } catch (error: any) {
    throw new Error(formatSolanaRpcError(error));
  }
}

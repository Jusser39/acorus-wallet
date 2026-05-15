import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createSolanaConnection, toSolanaPublicKey } from "./client";

export type SolanaNativeBalance = {
  lamports: string;
  sol: string;
};

export async function getSolanaNativeBalance(input: {
  address: string;
  rpcUrl?: string;
}): Promise<SolanaNativeBalance> {
  const connection = createSolanaConnection(input.rpcUrl);
  const publicKey = toSolanaPublicKey(input.address);
  const lamports = await connection.getBalance(publicKey, "confirmed");

  return {
    lamports: lamports.toString(),
    sol: (lamports / LAMPORTS_PER_SOL).toString(),
  };
}

import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  createSolanaConnections,
  formatSolanaRpcError,
  toSolanaPublicKey,
} from "./client";

export type SolanaSplTokenBalance = {
  mintAddress: string;
  tokenAccount: string;
  amountRaw: string;
  amountFormatted: string;
  decimals: number;
};

export async function getSolanaSplTokenBalances(input: {
  ownerAddress: string;
  rpcUrl?: string;
}): Promise<SolanaSplTokenBalance[]> {
  const owner = toSolanaPublicKey(input.ownerAddress);
  const connections = createSolanaConnections(input.rpcUrl);

  try {
    const accounts = await Promise.any(
      connections.map((connection) =>
        Promise.race([
          connection.getParsedTokenAccountsByOwner(owner, {
            programId: TOKEN_PROGRAM_ID,
          }),
          new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error("Solana RPC Timeout")), 2000)
          ),
        ])
      )
    );

    return accounts.value.map((item: any) => {
      const parsed = item.account.data.parsed;
      const info = parsed.info;
      const tokenAmount = info.tokenAmount;

      return {
        mintAddress: String(info.mint),
        tokenAccount: item.pubkey.toBase58(),
        amountRaw: String(tokenAmount.amount),
        amountFormatted: String(tokenAmount.uiAmountString ?? "0"),
        decimals: Number(tokenAmount.decimals ?? 0),
      };
    });
  } catch (error: any) {
    throw new Error(formatSolanaRpcError(error));
  }
}

import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createSolanaConnection, toSolanaPublicKey } from "./client";

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
  const connection = createSolanaConnection(input.rpcUrl);
  const owner = toSolanaPublicKey(input.ownerAddress);

  const accounts = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM_ID,
  });

  return accounts.value.map((item) => {
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
}

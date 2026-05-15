import type { TokenMetadata } from "@acorus/shared";
import { normalizeAddressForChain } from "@acorus/shared";
import { getSolanaNativeBalance } from "./balance";
import { getSolanaSplTokenBalances } from "./tokens";

export type SolanaPortfolioAsset = {
  chainId: 101;
  type: "native" | "spl";
  tokenAddress?: string | null;
  symbol: string;
  name: string;
  decimals: number;
  balanceRaw: string;
  balanceFormatted: string;
  logoUrl?: string | null;
  isVerified: boolean;
};

export async function getSolanaPortfolioBalances(input: {
  address: string;
  rpcUrl?: string;
  tokens: TokenMetadata[];
}): Promise<SolanaPortfolioAsset[]> {
  const [nativeBalance, splBalances] = await Promise.all([
    getSolanaNativeBalance({
      address: input.address,
      rpcUrl: input.rpcUrl,
    }),
    getSolanaSplTokenBalances({
      ownerAddress: input.address,
      rpcUrl: input.rpcUrl,
    }),
  ]);

  const knownTokensByMint = new Map(
    input.tokens.map((token) => [
      normalizeAddressForChain(token.chainId, token.tokenAddress),
      token,
    ]),
  );

  const assets: SolanaPortfolioAsset[] = [
    {
      chainId: 101,
      type: "native",
      tokenAddress: null,
      symbol: "SOL",
      name: "Solana",
      decimals: 9,
      balanceRaw: nativeBalance.lamports,
      balanceFormatted: nativeBalance.sol,
      logoUrl: null,
      isVerified: true,
    },
  ];

  for (const balance of splBalances) {
    const known = knownTokensByMint.get(
      normalizeAddressForChain(101, balance.mintAddress),
    );

    assets.push({
      chainId: 101,
      type: "spl",
      tokenAddress: balance.mintAddress,
      symbol: known?.symbol ?? "SPL",
      name: known?.name ?? "Unknown SPL Token",
      decimals: known?.decimals ?? balance.decimals,
      balanceRaw: balance.amountRaw,
      balanceFormatted: balance.amountFormatted,
      logoUrl: known?.logoUrl ?? null,
      isVerified: known?.isVerified ?? false,
    });
  }

  return assets;
}

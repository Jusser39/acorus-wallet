import {
  PRACTICE_LESSONS,
  type ChainFamily,
  type TokenMetadataItem,
} from "@acorus/shared";

export const PRACTICE_EVM_ADDRESS = "practice-wallet";
export const PRACTICE_SOLANA_ADDRESS = "11111111111111111111111111111111";
export const PRACTICE_ADDRESS = PRACTICE_EVM_ADDRESS;

export function getPracticeAddress(chainFamily: ChainFamily): string {
  return chainFamily === "solana" ? PRACTICE_SOLANA_ADDRESS : PRACTICE_EVM_ADDRESS;
}

export const PRACTICE_NATIVE_BALANCES: Record<number, string> = {
  1: "4.20",
  10: "6.00",
  56: "12.50",
  137: "240.00",
  8453: "8.40",
  42161: "5.60",
  101: "18.25",
};

export function getPracticeNativeBalance(chainId: number): string {
  return PRACTICE_NATIVE_BALANCES[chainId] ?? "3.00";
}

export function getPracticeTokens(chainId: number): Array<
  TokenMetadataItem & { balance: string }
> {
  const baseDate = new Date(0).toISOString();
  const items: Record<number, Array<TokenMetadataItem & { balance: string }>> = {
    1: [
      {
        id: "practice:1:usdt",
        chainId: 1,
        tokenAddress: "practice-usdt",
        symbol: "USDT",
        name: "Practice Tether",
        decimals: 6,
        logoUrl: null,
        isVerified: true,
        balance: "1500",
        createdAt: baseDate,
        updatedAt: baseDate,
      },
    ],
    137: [
      {
        id: "practice:137:usdc",
        chainId: 137,
        tokenAddress: "practice-usdc",
        symbol: "USDC",
        name: "Practice USD Coin",
        decimals: 6,
        logoUrl: null,
        isVerified: true,
        balance: "500",
        createdAt: baseDate,
        updatedAt: baseDate,
      },
    ],
    101: [
      {
        id: "practice:101:usdc",
        chainId: 101,
        tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        symbol: "USDC",
        name: "Practice USD Coin",
        decimals: 6,
        logoUrl: null,
        isVerified: true,
        balance: "350",
        createdAt: baseDate,
        updatedAt: baseDate,
      },
      {
        id: "practice:101:usdt",
        chainId: 101,
        tokenAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCo6b7mLK6fJd6FLy1i",
        symbol: "USDT",
        name: "Practice Tether",
        decimals: 6,
        logoUrl: null,
        isVerified: true,
        balance: "120",
        createdAt: baseDate,
        updatedAt: baseDate,
      },
    ],
  };

  return items[chainId] ?? [];
}

export { PRACTICE_LESSONS };

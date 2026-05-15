export interface CuratedToken {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl: string | null;
  verified: boolean;
}

export const CURATED_TOKENS: CuratedToken[] = [
  {
    chainId: 1,
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    logoUrl: null,
    verified: true,
  },
  {
    chainId: 1,
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logoUrl: null,
    verified: true,
  },
  {
    chainId: 56,
    address: "0x55d398326f99059fF775485246999027B3197955",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 18,
    logoUrl: null,
    verified: true,
  },
  {
    chainId: 56,
    address: "0x8ac76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 18,
    logoUrl: null,
    verified: true,
  },
  {
    chainId: 42161,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logoUrl: null,
    verified: true,
  },
  {
    chainId: 42161,
    address: "0xFd086bC7CD5C481DCC9C85ebe478A1C0b69FCbb9",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    logoUrl: null,
    verified: true,
  },
  {
    chainId: 10,
    address: "0x0b2C639c533813f4Aa9D7837CaF62653d097Ff85",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logoUrl: null,
    verified: true,
  },
  {
    chainId: 10,
    address: "0x94b008aA00579c1307B0EF2C499aD98a8Ce58e58",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    logoUrl: null,
    verified: true,
  },
  {
    chainId: 8453,
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bDA02913",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logoUrl: null,
    verified: true,
  },
  {
    chainId: 101,
    address: "Es9vMFrzaCERmJfrF4H2FYD4KCo6b7mLK6fJd6FLy1i",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    logoUrl: null,
    verified: true,
  },
  {
    chainId: 101,
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logoUrl: null,
    verified: true,
  },
  {
    chainId: 101,
    address: "So11111111111111111111111111111111111111112",
    symbol: "WSOL",
    name: "Wrapped SOL",
    decimals: 9,
    logoUrl: null,
    verified: true,
  },
];

export function getCuratedTokens(chainId: number): CuratedToken[] {
  return CURATED_TOKENS.filter((item) => item.chainId === chainId);
}

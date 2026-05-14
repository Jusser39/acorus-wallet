export type ChainFamily = "evm" | "solana" | "tron";

export type WalletProfileType = "local" | "view_only" | "practice";

export type PreferredCurrency = "USD" | "EUR" | "RUB";

export type TransactionAssetType = "native" | "erc20" | "nft" | "practice";

export type TransactionStatus = "pending" | "confirmed" | "failed" | "unknown";

export type TransactionDirection = "in" | "out" | "self";

export type SensitiveLogField =
  | "mnemonic"
  | "seed"
  | "seedPhrase"
  | "privateKey"
  | "passcode"
  | "password"
  | "signature"
  | "rawTransaction";

export interface ContactRecord {
  id: string;
  userId: string;
  name: string;
  address: string;
  chainFamily: ChainFamily;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WalletProfileRecord {
  id: string;
  userId: string;
  name: string;
  type: WalletProfileType;
  publicAddress: string;
  chainFamily: ChainFamily;
  hiddenBalance: boolean;
  preferredCurrency: PreferredCurrency;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRecordItem {
  id: string;
  userId: string;
  walletProfileId: string;
  chainId: number;
  hash: string;
  from: string;
  to: string;
  assetType: TransactionAssetType;
  tokenAddress: string | null;
  symbol: string;
  amount: string;
  status: TransactionStatus;
  direction: TransactionDirection;
  submittedAt: string;
  confirmedAt: string | null;
  rawStatus: string | null;
  explorerUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TokenMetadataItem {
  id: string;
  chainId: number;
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeLesson {
  id: string;
  title: string;
  description: string;
}

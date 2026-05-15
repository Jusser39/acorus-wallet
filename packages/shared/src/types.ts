import type { ChainFamily, ChainId, TransactionStatus } from "./multichain";

export type WalletProfileType = "local" | "view_only" | "practice";

export type PreferredCurrency = "USD" | "EUR" | "RUB";

export type SendAssetType = "native" | "erc20";

export type TransactionAssetType = "native" | "erc20" | "nft" | "practice";

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

export interface TransactionRecord {
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

export type TransactionRecordItem = TransactionRecord;

export interface TokenMetadata {
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

export type TokenMetadataItem = TokenMetadata;

export interface SendAsset {
  type: SendAssetType;
  chainId: number;
  symbol: string;
  tokenAddress?: string | null;
  decimals: number;
}

export interface ApiChainRecord {
  chainId: ChainId;
  family: ChainFamily;
  name: string;
  nativeSymbol: string;
  blockExplorerUrl: string;
  rpcUrlEnv?: string;
  enabled: boolean;
  isSkeleton?: boolean;
  network?: string;
}

export interface OnboardingProgressRecord {
  id: string;
  userId: string;
  step: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeLesson {
  id: string;
  title: string;
  description: string;
}

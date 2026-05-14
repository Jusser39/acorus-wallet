import {
  CURATED_TOKENS,
  EVM_CHAINS,
  type ChainFamily,
  type ContactRecord,
  type PreferredCurrency,
  type TokenMetadataItem,
  type TransactionRecordItem,
  type WalletProfileRecord,
  type WalletProfileType,
} from "@acorus/shared";
import { getEvmChainConfig } from "@acorus/shared";

export interface UserRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiChainRecord {
  chainId: number;
  family: ChainFamily;
  name: string;
  nativeSymbol: string;
  blockExplorerUrl: string;
  enabled: boolean;
}

export interface WalletProfileCreateInput {
  userId: string;
  name: string;
  type: WalletProfileType;
  publicAddress: string;
  chainFamily: "evm" | "solana" | "tron";
  hiddenBalance?: boolean;
  preferredCurrency?: PreferredCurrency;
}

export interface WalletProfileUpdateInput {
  userId: string;
  name?: string;
  hiddenBalance?: boolean;
  preferredCurrency?: PreferredCurrency;
}

export interface ContactCreateInput {
  userId: string;
  name: string;
  address: string;
  chainFamily: "evm" | "solana" | "tron";
  note?: string | null;
}

export interface ContactUpdateInput extends ContactCreateInput {}

export interface TransactionCreateInput {
  userId: string;
  walletProfileId: string;
  chainId: number;
  hash: string;
  from: string;
  to: string;
  assetType: "native" | "erc20" | "nft" | "practice";
  tokenAddress?: string | null;
  symbol: string;
  amount: string;
  status?: "pending" | "confirmed" | "failed" | "unknown";
  direction: "in" | "out" | "self";
  submittedAt?: string;
  confirmedAt?: string | null;
  rawStatus?: string | null;
}

export interface TransactionStatusUpdateInput {
  status: "pending" | "confirmed" | "failed" | "unknown";
  rawStatus?: string | null;
  confirmedAt?: string | null;
}

export interface OnboardingProgressRecord {
  id: string;
  userId: string;
  step: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppStore {
  close(): Promise<void>;
  createAnonymousUser(): Promise<UserRecord>;
  createWalletProfile(input: WalletProfileCreateInput): Promise<WalletProfileRecord>;
  listWalletProfiles(userId: string): Promise<WalletProfileRecord[]>;
  updateWalletProfile(
    id: string,
    input: WalletProfileUpdateInput,
  ): Promise<WalletProfileRecord>;
  deleteWalletProfile(id: string, userId: string): Promise<void>;
  createContact(input: ContactCreateInput): Promise<ContactRecord>;
  listContacts(userId: string): Promise<ContactRecord[]>;
  updateContact(id: string, input: ContactUpdateInput): Promise<ContactRecord>;
  deleteContact(id: string, userId: string): Promise<void>;
  createTransaction(input: TransactionCreateInput): Promise<TransactionRecordItem>;
  listTransactions(
    userId: string,
    walletProfileId?: string,
  ): Promise<TransactionRecordItem[]>;
  getTransaction(id: string, userId: string): Promise<TransactionRecordItem>;
  updateTransactionStatus(
    id: string,
    userId: string,
    input: TransactionStatusUpdateInput,
  ): Promise<TransactionRecordItem>;
  listChains(): Promise<ApiChainRecord[]>;
  listTokens(chainId?: number): Promise<TokenMetadataItem[]>;
  getOnboardingProgress(userId: string): Promise<OnboardingProgressRecord[]>;
  setOnboardingProgress(
    userId: string,
    step: string,
    completed: boolean,
  ): Promise<OnboardingProgressRecord>;
}

export function toExplorerUrl(chainId: number, hash: string): string | null {
  try {
    return `${getEvmChainConfig(chainId).blockExplorerUrl}/tx/${hash}`;
  } catch {
    return null;
  }
}

export function getChainsResponse(): ApiChainRecord[] {
  return EVM_CHAINS.map((chain) => ({
    ...chain,
    family: "evm" as const,
    enabled: true,
  }));
}

export function getCuratedTokenItems(chainId?: number): TokenMetadataItem[] {
  const items =
    typeof chainId === "number"
      ? CURATED_TOKENS.filter((token) => token.chainId === chainId)
      : CURATED_TOKENS;

  return items.map((token) => ({
    id: `${token.chainId}:${token.address.toLowerCase()}`,
    chainId: token.chainId,
    tokenAddress: token.address,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    logoUrl: token.logoUrl,
    isVerified: token.verified,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  }));
}

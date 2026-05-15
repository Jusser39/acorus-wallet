import {
  CURATED_TOKENS,
  EVM_CHAINS,
  SOLANA_CHAINS,
  type ApiChainRecord,
  type ChainFamily,
  type ContactRecord,
  type OnboardingProgressRecord,
  type PreferredCurrency,
  type TokenMetadataItem,
  type TransactionRecordItem,
  type WalletProfileRecord,
  type WalletProfileType,
  getExplorerTxUrl,
  normalizeAddressForChain,
} from "@acorus/shared";

export interface UserRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
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

export type FiatCurrency = "USD" | "EUR" | "RUB";
export type ChartRange = "1D" | "7D" | "1M" | "3M" | "1Y";
export type TokenRiskLevel = "low" | "medium" | "high" | "unknown";

export interface UserTokenDto {
  id: string;
  userId: string;
  walletProfileId?: string | null;
  chainId: number;
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string | null;
  isVerified: boolean;
  isCustom: boolean;
  isHidden: boolean;
  sourceStatus?: string | null;
  liquidityUsd?: number | null;
  volume24hUsd?: number | null;
  marketCapUsd?: number | null;
  fdvUsd?: number | null;
  pairUrl?: string | null;
  riskLevel?: TokenRiskLevel | null;
  riskFlags?: string[];
  riskFlagsJson?: string | null;
  lastMarketSyncAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserTokenInput {
  userId: string;
  walletProfileId?: string | null;
  chainId: number;
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string | null;
  isVerified?: boolean;
  isCustom?: boolean;
  isHidden?: boolean;
  sourceStatus?: string | null;
  liquidityUsd?: number | null;
  volume24hUsd?: number | null;
  marketCapUsd?: number | null;
  fdvUsd?: number | null;
  pairUrl?: string | null;
  riskLevel?: TokenRiskLevel | null;
  riskFlags?: string[];
  riskFlagsJson?: string | null;
}

export interface MarketPriceDto {
  chainId: number;
  tokenAddress?: string | null;
  symbol: string;
  currency: FiatCurrency;
  price: number;
  change24h?: { value: number; percent: number } | null;
  marketCap?: number | null;
  volume24h?: number | null;
  provider: string;
  updatedAt: string;
  sourceStatus?: string | null;
  liquidityUsd?: number | null;
  pairUrl?: string | null;
  riskLevel?: TokenRiskLevel | null;
  riskFlags?: string[];
  riskFlagsJson?: string | null;
}

export interface MarketChartDto {
  chainId: number;
  tokenAddress?: string | null;
  symbol: string;
  currency: FiatCurrency;
  range: ChartRange;
  points: Array<{ timestamp: string; price: number }>;
  provider: string;
  sourceStatus?: string | null;
  updatedAt: string;
}

export interface GetMarketPricesInput {
  chainId: number;
  currency: FiatCurrency;
  symbols?: string[];
  tokenAddresses?: string[];
}

export interface GetMarketChartInput {
  chainId: number;
  tokenAddress?: string | null;
  symbol: string;
  currency: FiatCurrency;
  range: ChartRange;
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
  listUserTokens(userId: string, walletProfileId?: string): Promise<UserTokenDto[]>;
  createUserToken(input: CreateUserTokenInput): Promise<UserTokenDto>;
  updateUserTokenVisibility(id: string, isHidden: boolean): Promise<UserTokenDto>;
  deleteUserToken(id: string): Promise<void>;
  hideToken(input: {
    userId: string;
    walletProfileId?: string | null;
    chainId: number;
    tokenAddress: string;
    symbol: string;
    name: string;
    decimals: number;
    isCustom?: boolean;
  }): Promise<UserTokenDto>;
  unhideToken(input: {
    userId: string;
    chainId: number;
    tokenAddress: string;
  }): Promise<UserTokenDto | null>;
  getMarketPrices(input: GetMarketPricesInput): Promise<MarketPriceDto[]>;
  upsertMarketPrice(input: MarketPriceDto): Promise<MarketPriceDto>;
  getMarketChart(input: GetMarketChartInput): Promise<MarketChartDto | null>;
  upsertMarketChart(input: MarketChartDto): Promise<MarketChartDto>;
}

export function toExplorerUrl(chainId: number, hash: string): string | null {
  try {
    return getExplorerTxUrl(chainId, hash);
  } catch {
    return null;
  }
}

export function getChainsResponse(): ApiChainRecord[] {
  return [...EVM_CHAINS, ...SOLANA_CHAINS].map((chain) => ({
    ...chain,
    enabled: true,
  }));
}

export function getCuratedTokenItems(chainId?: number): TokenMetadataItem[] {
  const items =
    typeof chainId === "number"
      ? CURATED_TOKENS.filter((token) => token.chainId === chainId)
      : CURATED_TOKENS;

  return items.map((token) => ({
    id: `${token.chainId}:${normalizeAddressForChain(token.chainId, token.address)}`,
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

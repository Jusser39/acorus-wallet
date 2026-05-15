export type ChainFamily = "evm" | "solana" | "tron" | "utxo" | "ton";

export type ChainId = number | string;

export type ChainRef = {
  family: ChainFamily;
  chainId: ChainId;
  name: string;
  nativeSymbol: string;
};

export type AssetType =
  | "native"
  | "erc20"
  | "spl"
  | "trc20"
  | "utxo"
  | "jetton"
  | "unknown";

export type AssetRef = {
  family: ChainFamily;
  chainId: ChainId;
  type: AssetType;
  symbol: string;
  name: string;
  decimals: number;
  tokenAddress?: string | null;
  logoUrl?: string | null;
  isVerified?: boolean;
};

export type AssetBalance = AssetRef & {
  balanceRaw: string;
  balanceFormatted: string;
  fiatValue?: number | null;
  priceUsd?: number | null;
  source?: string | null;
};

export type DerivedAccount = {
  family: ChainFamily;
  chainId: ChainId;
  publicAddress: string;
  derivationPath?: string;
};

export type ReceiveInfo = {
  family: ChainFamily;
  chainId: ChainId;
  address: string;
  qrValue: string;
  warning: string;
  explorerUrl?: string | null;
};

export type TransactionStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "failed"
  | "unknown";

export type UniversalTransactionRecord = {
  id?: string;
  family: ChainFamily;
  chainId: ChainId;
  hash: string;
  fromAddress?: string | null;
  toAddress?: string | null;
  asset?: AssetRef | null;
  amountRaw?: string | null;
  amountFormatted?: string | null;
  status: TransactionStatus;
  explorerUrl?: string | null;
  submittedAt?: string | null;
  confirmedAt?: string | null;
};

export type SendSupportStatus =
  | "supported"
  | "unsupported"
  | "coming_soon"
  | "skeleton"
  | "insufficient_data";

export type SendValidationIssueSeverity =
  | "info"
  | "warning"
  | "error";

export type SendValidationIssue = {
  code: string;
  severity: SendValidationIssueSeverity;
  message: string;
};

export type FeeEstimate = {
  feeAsset: AssetRef;
  feeRaw?: string | null;
  feeFormatted?: string | null;
  gasLimit?: string | null;
  gasPrice?: string | null;
  maxFeePerGas?: string | null;
  maxPriorityFeePerGas?: string | null;
  source: "live" | "estimated" | "fallback" | "unavailable";
};

export type SendDraftInput = {
  family: ChainFamily;
  chainId: ChainId;
  fromAddress: string;
  toAddress: string;
  asset: AssetRef;
  amountRaw?: string;
  amountFormatted?: string;
};

export type SendDraft = {
  family: ChainFamily;
  chainId: ChainId;
  fromAddress: string;
  toAddress: string;
  normalizedToAddress?: string | null;
  asset: AssetRef;
  amountRaw: string;
  amountFormatted: string;
  supportStatus: SendSupportStatus;
  feeEstimate?: FeeEstimate | null;
  issues: SendValidationIssue[];
  warnings: string[];
  errors: string[];
  canProceed: boolean;
  canBroadcast: boolean;
  createdAt: string;
};

export type BroadcastInput = {
  signedTransaction: string;
};

export type BroadcastResult = {
  hash: string;
  status: TransactionStatus;
  explorerUrl?: string | null;
};

export type SwapProvider =
  | "oneinch"
  | "zeroex"
  | "paraswap"
  | "jupiter"
  | "lifi"
  | "rango"
  | "mock";

export type SwapQuoteRequest = {
  fromChain: ChainRef;
  toChain: ChainRef;
  fromAsset: AssetRef;
  toAsset: AssetRef;
  amountRaw: string;
  walletAddress: string;
  slippageBps: number;
};

export type SwapRouteStep = {
  provider: SwapProvider;
  label: string;
  fromAsset: AssetRef;
  toAsset: AssetRef;
  estimatedAmountOutRaw?: string | null;
};

export type SwapQuote = {
  provider: SwapProvider;
  fromChain: ChainRef;
  toChain: ChainRef;
  fromAsset: AssetRef;
  toAsset: AssetRef;
  amountInRaw: string;
  estimatedAmountOutRaw: string;
  priceImpactPercent?: number | null;
  gasEstimateRaw?: string | null;
  route: SwapRouteStep[];
  warnings: string[];
  expiresAt: string;
};

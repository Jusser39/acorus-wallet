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

// ── Wave 5: Universal Send Execution Layer ────────────────────────────────────

export type SendExecutionStatus =
  | "submitted"
  | "rejected"
  | "failed"
  | "unsupported";

export type SendExecutionRequest = {
  draft: SendDraft;
  /** Marker only — the actual secret stays in frontend memory and is never sent to the backend. */
  signerSecretRef?: "local_vault";
};

export type SendExecutionResult = {
  family: ChainFamily;
  chainId: ChainId;
  status: SendExecutionStatus;
  txHash?: string | null;
  explorerUrl?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  broadcastProvider?: string | null;
  submittedAt: string;
};

// ─────────────────────────────────────────────────────────────────────────────

export type SwapQuoteStatus =
  | "quoted"
  | "no_route"
  | "unsupported"
  | "provider_error";

export type SwapProviderId =
  | "mock"
  | "zero_x"
  | "one_inch"
  | "paraswap"
  | "jupiter"
  | "sunswap"
  | "lifi"
  | "rango"
  | "socket";

/** Backward-compatible alias for older imports. */
export type SwapProvider = SwapProviderId;

export type SwapSlippageMode = "auto" | "custom";

export type SwapQuoteRequest = {
  from: AssetRef;
  to: AssetRef;
  amountRaw?: string;
  amountFormatted?: string;
  slippageBps?: number;
  slippageMode?: SwapSlippageMode;
  userAddress?: string | null;
};

export type SwapRouteStep = {
  provider: SwapProviderId;
  family: ChainFamily;
  chainId: ChainId;
  fromAsset: AssetRef;
  toAsset: AssetRef;
  fromAmountRaw: string;
  toAmountRaw: string;
  estimatedGasAsset?: AssetRef | null;
  estimatedGasRaw?: string | null;
  protocolName?: string | null;
};

export type SwapQuote = {
  id: string;
  status: SwapQuoteStatus;
  provider: SwapProviderId;
  from: AssetRef;
  to: AssetRef;
  fromAmountRaw: string;
  fromAmountFormatted: string;
  toAmountRaw?: string | null;
  toAmountFormatted?: string | null;
  priceImpactBps?: number | null;
  slippageBps: number;
  minimumReceivedRaw?: string | null;
  minimumReceivedFormatted?: string | null;
  route: SwapRouteStep[];
  warnings: string[];
  errors: string[];
  expiresAt?: string | null;
  createdAt: string;
};

// ── EVM 0x Swap MVP ─────────────────────────────────────────────────────────

export type EvmSwapProvider = "0x";

export type EvmSwapApprovalModel = "allowance_holder";

export type EvmSwapQuoteMode = "price" | "quote";

export type EvmSwapTokenRef = {
  chainId: number;
  address: string | "native";
  symbol: string;
  decimals: number;
  name?: string;
  logoUrl?: string | null;
};

export type EvmSwapAmountRequest =
  | {
      sellAmountRaw: string;
      buyAmountRaw?: never;
    }
  | {
      sellAmountRaw?: never;
      buyAmountRaw: string;
    };

export type EvmSwapPriceRequest = EvmSwapAmountRequest & {
  chainId: number;
  sellToken: EvmSwapTokenRef;
  buyToken: EvmSwapTokenRef;
  takerAddress: string;
  slippageBps?: number;
  affiliateFeeBps?: number;
  feeRecipient?: string;
  integratorId?: string;
};

export type EvmSwapAllowanceIssue = {
  spender?: string | null;
  currentAllowanceRaw?: string | null;
  requiredAllowanceRaw?: string | null;
};

export type EvmSwapIssues = {
  allowance?: EvmSwapAllowanceIssue | null;
  balance?: {
    token?: string | null;
    actualRaw?: string | null;
    expectedRaw?: string | null;
  } | null;
  simulationIncomplete?: boolean | null;
  invalidSourcesPassed?: string[] | null;
};

export type EvmSwapRouteSummary = {
  label: string;
  sources: Array<{
    name: string;
    proportionBps?: number | null;
  }>;
};

export type EvmSwapSafeRawSubset = {
  zid?: string | null;
  blockNumber?: string | number | null;
  fees?: unknown;
  issues?: EvmSwapIssues | null;
};

export type EvmSwapPriceResponse = {
  provider: EvmSwapProvider;
  approvalModel: EvmSwapApprovalModel;
  mode: "price";
  chainId: number;
  sellToken: EvmSwapTokenRef;
  buyToken: EvmSwapTokenRef;
  sellAmountRaw: string;
  buyAmountRaw: string;
  price: string;
  estimatedPriceImpact?: string | null;
  allowanceTarget?: string | null;
  issues?: EvmSwapIssues | null;
  liquidityAvailable: boolean;
  routeSummary: EvmSwapRouteSummary;
  warnings: string[];
  rawSafeSubset: EvmSwapSafeRawSubset;
};

export type EvmSwapApprovalTx = {
  tokenAddress: string;
  spender: string;
  currentAllowanceRaw?: string | null;
  requiredAllowanceRaw?: string | null;
  tx?: {
    to: string;
    data: string;
    value?: string | null;
    gas?: string | null;
  } | null;
};

export type EvmSwapQuoteResponse = {
  provider: EvmSwapProvider;
  approvalModel: EvmSwapApprovalModel;
  mode: "quote";
  requestId: string;
  chainId: number;
  takerAddress: string;
  sellToken: EvmSwapTokenRef;
  buyToken: EvmSwapTokenRef;
  sellAmountRaw: string;
  buyAmountRaw: string;
  minBuyAmountRaw?: string | null;
  to: string;
  data: string;
  value: string;
  gas?: string | null;
  gasPrice?: string | null;
  allowanceTarget?: string | null;
  approvalRequired: boolean;
  approval?: EvmSwapApprovalTx | null;
  routeSummary: EvmSwapRouteSummary;
  warnings: string[];
  estimatedPriceImpact?: string | null;
  price?: string | null;
  rawSafeSubset: EvmSwapSafeRawSubset;
  expiresAt: string;
};

export type EvmSwapExecutionDraft = {
  quoteId: string;
  requestId: string;
  chainId: number;
  fromAddress: string;
  to: string;
  data: string;
  value: string;
  gas?: string | null;
  gasPrice?: string | null;
  sellToken: EvmSwapTokenRef;
  buyToken: EvmSwapTokenRef;
  sellAmountRaw: string;
  buyAmountRaw: string;
  minBuyAmountRaw?: string | null;
  routeSummary: EvmSwapRouteSummary;
  riskLabels: string[];
  expiresAt?: string | null;
};

import type {
  AssetBalance,
  AssetRef,
  BroadcastInput,
  BroadcastResult,
  ChainFamily,
  ChainId,
  DerivedAccount,
  ReceiveInfo,
  SendDraft,
  SendDraftInput,
  SendExecutionResult,
  TransactionRecord,
} from "@acorus/shared";

export type BroadcastSendInput = {
  draft: SendDraft;
  /** BIP-39 mnemonic — present only in frontend memory, never sent to backend. */
  mnemonic?: string;
  /** Raw private key — alternative to mnemonic; frontend memory only. */
  privateKey?: string;
  rpcUrl?: string;
};

export type ChainAdapterCapabilities = {
  deriveAccount: boolean;
  nativeBalance: boolean;
  tokenBalances: boolean;
  receive: boolean;
  sendDraft: boolean;
  broadcast: boolean;
  history: boolean;
  swap: boolean;
  dapp: boolean;
};

export type ChainAdapter = {
  family: ChainFamily;
  chainId: ChainId;
  name: string;
  nativeAsset: AssetRef;
  capabilities: ChainAdapterCapabilities;

  validateAddress(address: string): boolean;

  deriveAccount?(input: {
    mnemonic: string;
    accountIndex?: number;
  }): Promise<DerivedAccount> | DerivedAccount;

  getNativeBalance(input: {
    address: string;
    rpcUrl?: string;
  }): Promise<AssetBalance>;

  getTokenBalances(input: {
    address: string;
    rpcUrl?: string;
  }): Promise<AssetBalance[]>;

  getReceiveInfo(input: {
    address: string;
  }): ReceiveInfo;

  buildExplorerAddressUrl(address: string): string;
  buildExplorerTxUrl(txHash: string): string;

  createSendDraft?(input: SendDraftInput): Promise<SendDraft>;
  broadcastTransaction?(input: BroadcastInput): Promise<BroadcastResult>;
  broadcastSend?(input: BroadcastSendInput): Promise<SendExecutionResult>;

  getTransactionHistory?(input: {
    address: string;
    rpcUrl?: string;
  }): Promise<TransactionRecord[]>;

  getSwapQuote?(input: {
    fromAddress: string;
    sellTokenAddress: string;
    buyTokenAddress: string;
    amountRaw: string;
    slippageBps?: number;
    rpcUrl?: string;
  }): Promise<unknown>;

  executeSwap?(input: {
    quote: unknown;
    mnemonic: string;
    rpcUrl?: string;
  }): Promise<SendExecutionResult>;

  signMessage?(input: {
    mnemonic: string;
    message: string;
  }): Promise<string>;

  signTypedData?(input: {
    mnemonic: string;
    typedData: unknown;
  }): Promise<string>;

  signTransaction?(input: {
    mnemonic: string;
    transaction: unknown;
  }): Promise<string>;
};

export function notImplemented(feature: string): never {
  throw new Error(`${feature}_not_implemented`);
}

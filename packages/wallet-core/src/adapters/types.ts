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
} from "@acorus/shared";

export type ChainAdapterCapabilities = {
  deriveAccount: boolean;
  nativeBalance: boolean;
  tokenBalances: boolean;
  receive: boolean;
  sendDraft: boolean;
  broadcast: boolean;
  history: boolean;
  swap: boolean;
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
};

export function notImplemented(feature: string): never {
  throw new Error(`${feature}_not_implemented`);
}

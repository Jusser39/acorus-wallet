import type { Address } from "viem";
import type { ChainFamily } from "@acorus/shared";

export type EncryptedVaultV1 = {
  version: 1;
  kdf: "pbkdf2-sha256";
  iterations: number;
  saltBase64: string;
  ivBase64: string;
  ciphertextBase64: string;
  createdAt: string;
};

export type WalletVaultPlaintext = {
  mnemonic: string;
  evmAddress: string;
  createdAt: string;
};

export interface WalletAdapter {
  chainFamily: ChainFamily;
  createAddressFromMnemonic(mnemonic: string): Promise<string>;
  getNativeBalance(
    address: string,
    chainIdOrNetwork: string | number,
    env?: Record<string, string | undefined>,
  ): Promise<string>;
}

export interface SwapQuoteInput {
  chainId: number;
  fromToken: string;
  toToken: string;
  amount: string;
}

export interface SwapQuote {
  providerId: string;
  amountIn: string;
  amountOut: string;
  routeSummary: string;
}

export interface SwapProvider {
  id: string;
  getQuote(input: SwapQuoteInput): Promise<SwapQuote>;
  buildTransaction(quote: SwapQuote): Promise<unknown>;
}

export interface NftItem {
  id: string;
  chainId: number;
  contractAddress: string;
  tokenId: string;
  name: string;
  imageUrl: string | null;
}

export interface NftProvider {
  getNfts(
    address: string,
    chainIdOrNetwork: string | number,
  ): Promise<NftItem[]>;
}

export interface SendNativeParams {
  mnemonic: string;
  chainId: number;
  to: Address;
  amountWei: bigint;
  env?: Record<string, string | undefined>;
}

export interface SendErc20Params {
  mnemonic: string;
  chainId: number;
  tokenAddress: Address;
  to: Address;
  amountUnits: bigint;
  env?: Record<string, string | undefined>;
}

export interface EstimateNativeTransferParams {
  from: Address;
  to: Address;
  value: bigint;
  chainId: number;
  env?: Record<string, string | undefined>;
}

export interface EstimateErc20TransferParams {
  from: Address;
  to: Address;
  tokenAddress: Address;
  amountUnits: bigint;
  chainId: number;
  env?: Record<string, string | undefined>;
}

export interface PracticeTransaction {
  id: string;
  symbol: string;
  amount: string;
  to: string;
  status: "pending" | "confirmed";
  createdAt: string;
}

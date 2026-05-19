import type { Address } from "viem";
import type { ChainFamily } from "@acorus/shared";
import type { EvmClientOptions } from "./evm/client";

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
  clientOptions?: EvmClientOptions;
}

export interface SendErc20Params {
  mnemonic: string;
  chainId: number;
  tokenAddress: Address;
  to: Address;
  amountUnits: bigint;
  env?: Record<string, string | undefined>;
  clientOptions?: EvmClientOptions;
}

export interface EstimateNativeTransferParams {
  from: Address;
  to: Address;
  value: bigint;
  chainId: number;
  env?: Record<string, string | undefined>;
  clientOptions?: EvmClientOptions;
}

export interface EstimateErc20TransferParams {
  from: Address;
  to: Address;
  tokenAddress: Address;
  amountUnits: bigint;
  chainId: number;
  env?: Record<string, string | undefined>;
  clientOptions?: EvmClientOptions;
}

export interface EvmFeeEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  estimatedFeeWei: bigint;
}

export interface PracticeTransaction {
  id: string;
  symbol: string;
  amount: string;
  to: string;
  status: "pending" | "confirmed";
  createdAt: string;
}

import type { Address, Hash } from "viem";
import { encodeFunctionData, getAddress, isAddress } from "viem";
import { createEvmPublicClient, createEvmWalletClient } from "./client";
import { ERC20_ABI } from "./erc20Abi";
import type {
  EvmFeeEstimate,
  EstimateErc20TransferParams,
  EstimateNativeTransferParams,
  SendErc20Params,
  SendNativeParams,
} from "../types";
import { deriveEvmAccountFromMnemonic } from "../mnemonic";

async function buildFeeEstimate(
  chainId: number,
  env: Record<string, string | undefined> | undefined,
  clientOptions: Parameters<typeof createEvmPublicClient>[2] | undefined,
  estimateGas: () => Promise<bigint>,
): Promise<EvmFeeEstimate> {
  const client = createEvmPublicClient(chainId, env, clientOptions);
  const [gasLimit, gasPrice] = await Promise.all([estimateGas(), client.getGasPrice()]);

  return {
    gasLimit,
    gasPrice,
    estimatedFeeWei: gasLimit * gasPrice,
  };
}

export async function estimateNativeTransferGas(
  params: EstimateNativeTransferParams,
): Promise<bigint> {
  const client = createEvmPublicClient(params.chainId, params.env, params.clientOptions);

  return client.estimateGas({
    account: params.from,
    to: params.to,
    value: params.value,
  });
}

export async function estimateNativeTransferFee(
  params: EstimateNativeTransferParams,
): Promise<EvmFeeEstimate> {
  return buildFeeEstimate(params.chainId, params.env, params.clientOptions, () =>
    estimateNativeTransferGas(params),
  );
}

export async function estimateErc20TransferGas(
  params: EstimateErc20TransferParams,
): Promise<bigint> {
  const client = createEvmPublicClient(params.chainId, params.env, params.clientOptions);

  return client.estimateGas({
    account: params.from,
    to: params.tokenAddress,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [params.to, params.amountUnits],
    }),
  });
}

export async function estimateErc20TransferFee(
  params: EstimateErc20TransferParams,
): Promise<EvmFeeEstimate> {
  return buildFeeEstimate(params.chainId, params.env, params.clientOptions, () =>
    estimateErc20TransferGas(params),
  );
}

export async function sendNativeTransaction(
  params: SendNativeParams,
): Promise<Hash> {
  const client = createEvmWalletClient(
    params.mnemonic,
    params.chainId,
    params.env,
    params.clientOptions,
  );

  return client.sendTransaction({
    to: params.to,
    value: params.amountWei,
    chain: client.chain,
    account: client.account!,
  });
}

export async function sendErc20Transaction(
  params: SendErc20Params,
): Promise<Hash> {
  const account = deriveEvmAccountFromMnemonic(params.mnemonic);
  const publicClient = createEvmPublicClient(
    params.chainId,
    params.env,
    params.clientOptions,
  );
  const walletClient = createEvmWalletClient(
    params.mnemonic,
    params.chainId,
    params.env,
    params.clientOptions,
  );
  const request = await publicClient.simulateContract({
    account,
    address: params.tokenAddress,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [params.to, params.amountUnits],
  });

  return walletClient.writeContract(request.request);
}

export function assertAddress(value: string): Address {
  if (!isAddress(value)) {
    throw new Error("Invalid EVM address.");
  }

  return getAddress(value);
}

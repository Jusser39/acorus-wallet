import type { Address, Hash } from "viem";
import { encodeFunctionData } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { createEvmPublicClient, createEvmWalletClient } from "./client";
import { ERC20_ABI } from "./erc20Abi";
import type {
  EstimateErc20TransferParams,
  EstimateNativeTransferParams,
  SendErc20Params,
  SendNativeParams,
} from "../types";

export async function estimateNativeTransferGas(
  params: EstimateNativeTransferParams,
): Promise<bigint> {
  const client = createEvmPublicClient(params.chainId, params.env);

  return client.estimateGas({
    account: params.from,
    to: params.to,
    value: params.value,
  });
}

export async function estimateErc20TransferGas(
  params: EstimateErc20TransferParams,
): Promise<bigint> {
  const client = createEvmPublicClient(params.chainId, params.env);

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

export async function sendNativeTransaction(
  params: SendNativeParams,
): Promise<Hash> {
  const client = createEvmWalletClient(params.mnemonic, params.chainId, params.env);

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
  const account = mnemonicToAccount(params.mnemonic.trim().toLowerCase());
  const publicClient = createEvmPublicClient(params.chainId, params.env);
  const walletClient = createEvmWalletClient(
    params.mnemonic,
    params.chainId,
    params.env,
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
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error("Invalid EVM address.");
  }

  return value as Address;
}

import { getExplorerAddressUrl, type ChainFamily, type ChainId } from "@acorus/shared";
import { createDefaultAdapterRegistry } from "@acorus/wallet-core";

const registry = createDefaultAdapterRegistry();

export function getUniversalExplorerAddressUrl(input: {
  family: ChainFamily;
  chainId: ChainId;
  address: string;
}): string | null {
  const adapter = registry.get({ family: input.family, chainId: input.chainId });
  return adapter?.buildExplorerAddressUrl(input.address) ?? null;
}

export function getUniversalExplorerTxUrl(input: {
  family: ChainFamily;
  chainId: ChainId;
  txHash: string;
}): string | null {
  const adapter = registry.get({ family: input.family, chainId: input.chainId });
  return adapter?.buildExplorerTxUrl(input.txHash) ?? null;
}

export function getUniversalTokenExplorerUrl(input: {
  family: ChainFamily;
  chainId: ChainId;
  tokenAddress?: string | null;
}): string | null {
  if (!input.tokenAddress) return null;

  if (input.family === "evm") {
    const adapter = registry.get({ family: input.family, chainId: input.chainId });
    if (adapter) {
      return adapter.buildExplorerAddressUrl(input.tokenAddress);
    }

    try {
      return getExplorerAddressUrl(input.chainId, input.tokenAddress);
    } catch {
      return null;
    }
  }

  if (input.family === "solana") {
    return `https://solscan.io/token/${input.tokenAddress}`;
  }

  if (input.family === "tron") {
    return `https://tronscan.org/#/token20/${input.tokenAddress}`;
  }

  return null;
}

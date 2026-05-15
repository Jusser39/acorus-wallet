import type { ChainFamily, ChainId } from "@acorus/shared";
import { EVM_CHAINS, UNIVERSAL_CHAINS, getUniversalChain } from "@acorus/shared";
import { getRpcUrl } from "@acorus/wallet-core";

export function getDefaultChainIdForFamily(family: ChainFamily): ChainId {
  switch (family) {
    case "evm": return 1;
    case "solana": return 101;
    case "tron": return "tron-mainnet";
    case "utxo": return "bitcoin-mainnet";
    case "ton": return "ton-mainnet";
    default: return 1;
  }
}

export function getProfileDefaultChain(input: {
  chainFamily: ChainFamily;
  selectedChainId?: number | string;
}): {
  family: ChainFamily;
  chainId: ChainId;
  name: string;
  nativeSymbol: string;
  isSkeleton: boolean;
} {
  if (input.chainFamily === "evm") {
    const evmChainId =
      typeof input.selectedChainId === "number" ? input.selectedChainId : 1;
    const evm = EVM_CHAINS.find((chain) => chain.chainId === evmChainId) ?? EVM_CHAINS[0]!;
    return {
      family: "evm",
      chainId: evm.chainId,
      name: evm.name,
      nativeSymbol: evm.nativeSymbol,
      isSkeleton: false,
    };
  }

  const chainId = getDefaultChainIdForFamily(input.chainFamily);
  const chain = getUniversalChain({ family: input.chainFamily, chainId });
  return {
    family: input.chainFamily,
    chainId,
    name: chain?.name ?? String(chainId),
    nativeSymbol: chain?.nativeSymbol ?? "",
    isSkeleton: chain?.isSkeleton ?? false,
  };
}

export function getRpcUrlForUniversalChain(input: {
  family: ChainFamily;
  chainId: ChainId;
}): string {
  if (input.family === "solana") {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  }
  if (input.family === "evm" && typeof input.chainId === "number") {
    try {
      return getRpcUrl(input.chainId);
    } catch {
      return "";
    }
  }
  return "";
}

export function getEnabledChainFamilies(): ChainFamily[] {
  return ["evm", "solana", "tron", "utxo"];
}

export function getEnabledUniversalChainsForUi() {
  return UNIVERSAL_CHAINS;
}

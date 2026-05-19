import type { ChainFamily, ChainId } from "@acorus/shared";
import { EVM_CHAINS } from "@acorus/shared";
import {
  getDefaultChainIdForFamily,
  getEnabledChainFamilies,
  getProfileDefaultChain,
} from "./universal-chains";
import type { SendNetworkOption } from "./send-ui";

function getFamilySendStatus(family: ChainFamily): SendNetworkOption["sendStatus"] {
  if (family === "evm") return "supported";
  if (family === "solana") return "supported";
  return "skeleton";
}

export function buildSendNetworkOptions(): SendNetworkOption[] {
  const evmOptions: SendNetworkOption[] = EVM_CHAINS.map((chain) => ({
    id: `evm:${chain.chainId}`,
    family: "evm" as const,
    chainId: chain.chainId,
    label: chain.name,
    nativeSymbol: chain.nativeSymbol,
    isSkeleton: false,
    sendStatus: "supported" as const,
  }));

  const nonEvmOptions: SendNetworkOption[] = getEnabledChainFamilies()
    .filter((family) => family !== "evm")
    .map((family) => {
      const chainId = getDefaultChainIdForFamily(family);
      const chain = getProfileDefaultChain({
        chainFamily: family,
        selectedChainId: chainId,
      });

      return {
        id: `${family}:${String(chainId)}`,
        family,
        chainId,
        label: chain.name,
        nativeSymbol: chain.nativeSymbol,
        isSkeleton: chain.isSkeleton,
        sendStatus: getFamilySendStatus(family),
      };
    });

  return [...evmOptions, ...nonEvmOptions];
}

export function findSendNetworkOption(input: {
  family: ChainFamily;
  chainId: ChainId;
}): SendNetworkOption | null {
  return (
    buildSendNetworkOptions().find(
      (item) =>
        item.family === input.family &&
        String(item.chainId) === String(input.chainId),
    ) ?? null
  );
}

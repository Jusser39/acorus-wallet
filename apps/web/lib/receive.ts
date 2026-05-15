import type { ChainFamily, ReceiveInfo } from "@acorus/shared";
import { createDefaultAdapterRegistry } from "@acorus/wallet-core";

const registry = createDefaultAdapterRegistry();

export function getUniversalReceiveInfo(input: {
  family: ChainFamily;
  chainId: number | string;
  address: string;
}): ReceiveInfo {
  const adapter = registry.require({
    family: input.family,
    chainId: input.chainId,
  });

  return adapter.getReceiveInfo({
    address: input.address,
  });
}

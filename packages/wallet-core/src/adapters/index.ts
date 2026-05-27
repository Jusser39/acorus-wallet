export * from "./types";
export * from "./registry";
export * from "./evm-adapter";
export * from "./solana-adapter";
export * from "./tron-adapter";
export * from "./utxo-adapter";
export * from "./tron";
export * from "./bitcoin";

import { ChainAdapterRegistry } from "./registry";
import { createAllEvmAdapters } from "./evm-adapter";
import { createSolanaAdapter } from "./solana-adapter";
import { createBitcoinAdapter } from "./bitcoin";
import { createTronAdapter } from "./tron";

export function createDefaultAdapterRegistry(): ChainAdapterRegistry {
  const registry = new ChainAdapterRegistry();

  for (const adapter of createAllEvmAdapters()) {
    registry.register(adapter);
  }

  registry.register(createSolanaAdapter());
  registry.register(createTronAdapter());
  registry.register(createBitcoinAdapter());

  return registry;
}

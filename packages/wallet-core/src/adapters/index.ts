export * from "./types";
export * from "./registry";
export * from "./evm-adapter";
export * from "./solana-adapter";
export * from "./tron-adapter";
export * from "./utxo-adapter";

import { ChainAdapterRegistry } from "./registry";
import { createAllEvmAdapters } from "./evm-adapter";
import { createSolanaAdapter } from "./solana-adapter";
import { createTronAdapter } from "./tron-adapter";
import { createBitcoinAdapter } from "./utxo-adapter";

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

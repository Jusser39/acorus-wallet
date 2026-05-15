import type { ChainFamily, ChainId } from "@acorus/shared";
import type { ChainAdapter } from "./types";

export class ChainAdapterRegistry {
  private readonly adapters = new Map<string, ChainAdapter>();

  register(adapter: ChainAdapter): void {
    this.adapters.set(this.key(adapter.family, adapter.chainId), adapter);
  }

  get(input: { family: ChainFamily; chainId: ChainId }): ChainAdapter | undefined {
    return this.adapters.get(this.key(input.family, input.chainId));
  }

  require(input: { family: ChainFamily; chainId: ChainId }): ChainAdapter {
    const adapter = this.get(input);

    if (!adapter) {
      throw new Error(`chain_adapter_not_found:${input.family}:${String(input.chainId)}`);
    }

    return adapter;
  }

  list(): ChainAdapter[] {
    return [...this.adapters.values()];
  }

  private key(family: ChainFamily, chainId: ChainId): string {
    return `${family}:${String(chainId)}`;
  }
}

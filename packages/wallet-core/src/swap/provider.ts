import type { ChainFamily, SwapProviderId, SwapQuote, SwapQuoteRequest } from "@acorus/shared";

export type SwapProviderCapabilities = {
  sameChain: boolean;
  crossChain: boolean;
  families: readonly ChainFamily[];
  execution: boolean;
};

export interface SwapQuoteProvider {
  readonly id: SwapProviderId;
  readonly name: string;
  readonly capabilities: SwapProviderCapabilities;

  canQuote(request: SwapQuoteRequest): boolean;

  getQuote(request: SwapQuoteRequest): Promise<SwapQuote>;
}

export function isSameChainSwap(request: SwapQuoteRequest): boolean {
  return (
    request.from.family === request.to.family &&
    String(request.from.chainId) === String(request.to.chainId)
  );
}

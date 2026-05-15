export type {
  SwapProvider,
  SwapQuote,
  SwapQuoteRequest,
  SwapRouteStep,
} from "@acorus/shared";

import type { SwapProvider, SwapQuote, SwapQuoteRequest } from "@acorus/shared";

export type SwapQuoteProvider = {
  provider: SwapProvider;

  getQuote(input: SwapQuoteRequest): Promise<SwapQuote>;
};

export class SwapNotImplementedProvider implements SwapQuoteProvider {
  provider = "mock" as const;

  async getQuote(): Promise<SwapQuote> {
    throw new Error("swap_not_implemented");
  }
}

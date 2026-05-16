import type { SwapQuote, SwapQuoteRequest } from "@acorus/shared";
import { MockSwapQuoteProvider } from "./mock-provider";
import type { SwapQuoteProvider } from "./provider";

function createNoRouteQuote(request: SwapQuoteRequest): SwapQuote {
  return {
    id: `no_route_${Date.now()}`,
    status: "no_route",
    provider: "mock",
    from: request.from,
    to: request.to,
    fromAmountRaw: request.amountRaw ?? "0",
    fromAmountFormatted: request.amountFormatted ?? "0",
    toAmountRaw: null,
    toAmountFormatted: null,
    priceImpactBps: null,
    slippageBps: request.slippageBps ?? 50,
    minimumReceivedRaw: null,
    minimumReceivedFormatted: null,
    route: [],
    warnings: [],
    errors: ["No quote provider can route this swap."],
    expiresAt: null,
    createdAt: new Date().toISOString(),
  };
}

export class SwapQuoteEngine {
  constructor(private readonly providers: SwapQuoteProvider[]) {}

  async getQuote(request: SwapQuoteRequest): Promise<SwapQuote> {
    const provider = this.providers.find((item) => item.canQuote(request));

    if (!provider) {
      return createNoRouteQuote(request);
    }

    return provider.getQuote(request);
  }
}

export function createDefaultSwapQuoteEngine(): SwapQuoteEngine {
  return new SwapQuoteEngine([
    new MockSwapQuoteProvider(),
  ]);
}

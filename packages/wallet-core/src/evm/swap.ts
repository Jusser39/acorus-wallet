export type ZeroXQuoteRequest = {
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  taker: string;
  slippageBps?: number;
  apiBaseUrl?: string;
};

export type ZeroXQuoteResponse = {
  id: string;
  provider: string;
  status: "success" | "no_route" | "rate_limited" | "error";
  from: string;
  to: string;
  fromAmountRaw: string;
  fromAmountFormatted: string;
  toAmountRaw: string | null;
  toAmountFormatted: string | null;
  priceImpactBps: number | null;
  slippageBps: number;
  minimumReceivedRaw: string | null;
  minimumReceivedFormatted: string | null;
  route: unknown[];
  warnings: string[];
  errors: string[];
  expiresAt: string | null;
  createdAt: string;
  transaction?: {
    to: string;
    data: string;
    value: string;
  };
};

export async function fetchZeroXQuote(
  request: ZeroXQuoteRequest,
): Promise<ZeroXQuoteResponse> {
  const baseUrl = request.apiBaseUrl || "https://24wallet.ru";
  const params = new URLSearchParams({
    chainId: request.chainId.toString(),
    sellToken: request.sellToken,
    buyToken: request.buyToken,
    sellAmount: request.sellAmount,
    taker: request.taker,
  });

  if (request.slippageBps !== undefined) {
    params.append("slippageBps", request.slippageBps.toString());
  }

  const response = await fetch(`${baseUrl}/api/swap/evm/0x/quote?${params.toString()}`, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("0x_rate_limited");
    }
    throw new Error(`0x_quote_failed_${response.status}`);
  }

  const json = await response.json();
  return json as ZeroXQuoteResponse;
}

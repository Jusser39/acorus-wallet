export type RangoQuoteRequest = {
  from: string;
  to: string;
  amount: string;
  slippageBps?: number;
  apiBaseUrl?: string;
};

export type RangoSwapRequest = RangoQuoteRequest & {
  fromAddress?: string;
  toAddress?: string;
};

export type RangoQuoteResponse = {
  requestId: string;
  resultType: string;
  route: {
    path: unknown[];
    outputAmount: string;
    outputAmountMin: string;
    outputAmountUsd: number;
    feeUsd: number;
  };
  error?: string;
};

export type RangoSwapResponse = {
  requestId: string;
  ok: boolean;
  error?: string;
  transaction?: {
    type: string;
    blockChain: string;
    from: string;
    to: string;
    data: string;
    value: string;
    fee: string;
    isApprovalTx: boolean;
    txData?: unknown;
  };
};

export async function fetchRangoQuote(
  request: RangoQuoteRequest,
): Promise<RangoQuoteResponse> {
  const baseUrl = request.apiBaseUrl || "https://24wallet.ru";
  const params = new URLSearchParams({
    from: request.from,
    to: request.to,
    amount: request.amount,
  });

  if (request.slippageBps !== undefined) {
    params.append("slippageBps", request.slippageBps.toString());
  }

  const response = await fetch(`${baseUrl}/api/swap/rango/quote?${params.toString()}`, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`rango_quote_failed_${response.status}`);
  }

  return response.json() as Promise<RangoQuoteResponse>;
}

export async function fetchRangoSwapTransaction(
  request: RangoSwapRequest,
): Promise<RangoSwapResponse> {
  const baseUrl = request.apiBaseUrl || "https://24wallet.ru";
  const params = new URLSearchParams({
    from: request.from,
    to: request.to,
    amount: request.amount,
  });

  if (request.fromAddress) {
    params.append("fromAddress", request.fromAddress);
  }
  
  if (request.toAddress) {
    params.append("toAddress", request.toAddress);
  }

  if (request.slippageBps !== undefined) {
    params.append("slippageBps", request.slippageBps.toString());
  }

  const response = await fetch(`${baseUrl}/api/swap/rango/swap?${params.toString()}`, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`rango_swap_failed_${response.status}`);
  }

  return response.json() as Promise<RangoSwapResponse>;
}

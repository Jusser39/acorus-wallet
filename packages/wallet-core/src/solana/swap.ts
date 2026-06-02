export type JupiterQuoteRequest = {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
  apiBaseUrl?: string;
};

export type JupiterSwapRequest = JupiterQuoteRequest & {
  userPublicKey: string;
};

export type JupiterQuoteResponse = {
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
};

export type JupiterSwapResponse = {
  swapTransaction: string;
};

export async function fetchJupiterQuote(
  request: JupiterQuoteRequest,
): Promise<JupiterQuoteResponse> {
  const baseUrl = request.apiBaseUrl || "https://24wallet.ru";
  const params = new URLSearchParams({
    inputMint: request.inputMint,
    outputMint: request.outputMint,
    amount: request.amount,
  });

  if (request.slippageBps !== undefined) {
    params.append("slippageBps", request.slippageBps.toString());
  }

  const response = await fetch(`${baseUrl}/api/swap/solana/jupiter/quote?${params.toString()}`, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("jupiter_rate_limited");
    }
    throw new Error(`jupiter_quote_failed_${response.status}`);
  }

  return response.json() as Promise<JupiterQuoteResponse>;
}

export async function fetchJupiterSwapTransaction(
  request: JupiterSwapRequest,
): Promise<JupiterSwapResponse> {
  const baseUrl = request.apiBaseUrl || "https://24wallet.ru";
  const params = new URLSearchParams({
    inputMint: request.inputMint,
    outputMint: request.outputMint,
    amount: request.amount,
    userPublicKey: request.userPublicKey,
  });

  if (request.slippageBps !== undefined) {
    params.append("slippageBps", request.slippageBps.toString());
  }

  const response = await fetch(`${baseUrl}/api/swap/solana/jupiter/swap?${params.toString()}`, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("jupiter_rate_limited");
    }
    throw new Error(`jupiter_swap_failed_${response.status}`);
  }

  return response.json() as Promise<JupiterSwapResponse>;
}

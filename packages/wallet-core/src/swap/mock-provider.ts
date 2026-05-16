import type { AssetRef, SwapQuote, SwapQuoteRequest } from "@acorus/shared";
import { getUniversalChain } from "@acorus/shared";
import { formatRawAmount, normalizeSendAmount, parseDecimalAmountToRaw } from "../send/amount";
import type { SwapQuoteProvider } from "./provider";
import { isSameChainSwap } from "./provider";

function getMockRate(input: {
  from: AssetRef;
  to: AssetRef;
}): number {
  const from = input.from.symbol.toUpperCase();
  const to = input.to.symbol.toUpperCase();

  if (from === to) return 1;

  const usdRates: Record<string, number> = {
    ETH: 3200,
    WETH: 3200,
    BNB: 600,
    MATIC: 0.8,
    POL: 0.8,
    SOL: 150,
    WSOL: 150,
    TRX: 0.12,
    BTC: 65000,
    USDT: 1,
    USDC: 1,
    DAI: 1,
  };

  const fromUsd = usdRates[from] ?? 1;
  const toUsd = usdRates[to] ?? 1;

  return fromUsd / toUsd;
}

function applyMockFee(amount: number): number {
  return amount * 0.997;
}

function makeQuoteId(): string {
  return `mock_quote_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getDefaultDecimalsForFamily(asset: AssetRef): number {
  if (asset.family === "solana") return 9;
  if (asset.family === "tron") return 6;
  if (asset.family === "utxo") return 8;
  return 18;
}

function createEstimatedGasAsset(asset: AssetRef): AssetRef {
  const chain = getUniversalChain({
    family: asset.family,
    chainId: asset.chainId,
  });

  return {
    family: asset.family,
    chainId: asset.chainId,
    type: asset.family === "utxo" ? "utxo" : "native",
    symbol: chain?.nativeSymbol ?? asset.symbol,
    name: `${chain?.name ?? asset.family} gas`,
    decimals: getDefaultDecimalsForFamily(asset),
    tokenAddress: null,
    isVerified: true,
  };
}

export class MockSwapQuoteProvider implements SwapQuoteProvider {
  readonly id = "mock" as const;
  readonly name = "Mock Universal Swap Quote";
  readonly capabilities = {
    sameChain: true,
    crossChain: true,
    families: ["evm", "solana", "tron", "utxo", "ton"] as const,
    execution: false,
  };

  canQuote(_request: SwapQuoteRequest): boolean {
    return true;
  }

  async getQuote(request: SwapQuoteRequest): Promise<SwapQuote> {
    try {
      const normalized = normalizeSendAmount({
        amountRaw: request.amountRaw,
        amountFormatted: request.amountFormatted,
        decimals: request.from.decimals,
      });

      const fromFormatted = Number(normalized.amountFormatted);
      if (!Number.isFinite(fromFormatted) || fromFormatted <= 0) {
        throw new Error("amount_invalid");
      }

      const rate = getMockRate({
        from: request.from,
        to: request.to,
      });

      const estimatedToFormatted = applyMockFee(fromFormatted * rate);
      const toAmountRaw = parseDecimalAmountToRaw({
        amountFormatted: estimatedToFormatted.toFixed(
          Math.min(request.to.decimals, 8),
        ),
        decimals: request.to.decimals,
      });
      const toAmountFormatted = formatRawAmount({
        amountRaw: toAmountRaw,
        decimals: request.to.decimals,
      });

      const slippageBps = request.slippageBps ?? 50;
      const minimumReceived = estimatedToFormatted * (1 - slippageBps / 10_000);
      const minimumReceivedRaw = parseDecimalAmountToRaw({
        amountFormatted: minimumReceived.toFixed(
          Math.min(request.to.decimals, 8),
        ),
        decimals: request.to.decimals,
      });

      const crossChain = !isSameChainSwap(request);

      return {
        id: makeQuoteId(),
        status: "quoted",
        provider: "mock",
        from: request.from,
        to: request.to,
        fromAmountRaw: normalized.amountRaw,
        fromAmountFormatted: normalized.amountFormatted,
        toAmountRaw,
        toAmountFormatted,
        priceImpactBps: crossChain ? 120 : 35,
        slippageBps,
        minimumReceivedRaw,
        minimumReceivedFormatted: formatRawAmount({
          amountRaw: minimumReceivedRaw,
          decimals: request.to.decimals,
        }),
        route: [
          {
            provider: "mock",
            family: request.from.family,
            chainId: request.from.chainId,
            fromAsset: request.from,
            toAsset: request.to,
            fromAmountRaw: normalized.amountRaw,
            toAmountRaw,
            estimatedGasAsset: createEstimatedGasAsset(request.from),
            estimatedGasRaw: null,
            protocolName: crossChain ? "Mock cross-chain route" : "Mock DEX route",
          },
        ],
        warnings: [
          "Quote is mock/preview only. Real swap execution is not enabled.",
          ...(crossChain
            ? ["Cross-chain route is preview-only and not executable yet."]
            : []),
        ],
        errors: [],
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        id: makeQuoteId(),
        status: "provider_error",
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
        errors: [
          error instanceof Error ? error.message : "Failed to build mock quote.",
        ],
        expiresAt: null,
        createdAt: new Date().toISOString(),
      };
    }
  }
}

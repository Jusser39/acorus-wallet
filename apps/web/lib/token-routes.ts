import {
  DEFAULT_BITCOIN_CHAIN_ID,
  DEFAULT_SOLANA_CHAIN_ID,
  DEFAULT_TON_CHAIN_ID,
  DEFAULT_TRON_CHAIN_ID,
  EVM_CHAINS,
  type ChainFamily,
  type ExploreTokenItem,
} from "@acorus/shared";

type TokenRouteInput = {
  chainId?: number | string | null;
  chainKey?: string | null;
  tokenAddress?: string | null;
  symbol?: string | null;
  name?: string | null;
};

const NATIVE_SYMBOL_ROUTES: Record<string, { chainId: number | string; family: ChainFamily }> = {
  ETH: { chainId: 1, family: "evm" },
  WETH: { chainId: 1, family: "evm" },
  BNB: { chainId: 56, family: "evm" },
  MATIC: { chainId: 137, family: "evm" },
  POL: { chainId: 137, family: "evm" },
  AVAX: { chainId: 43114, family: "evm" },
  SOL: { chainId: DEFAULT_SOLANA_CHAIN_ID, family: "solana" },
  TRX: { chainId: DEFAULT_TRON_CHAIN_ID, family: "tron" },
  BTC: { chainId: DEFAULT_BITCOIN_CHAIN_ID, family: "utxo" },
  TON: { chainId: DEFAULT_TON_CHAIN_ID, family: "ton" },
};

const CHAIN_KEY_ROUTES: Record<string, { chainId: number | string; family: ChainFamily }> = {
  ethereum: { chainId: 1, family: "evm" },
  eth: { chainId: 1, family: "evm" },
  bsc: { chainId: 56, family: "evm" },
  "binance-smart-chain": { chainId: 56, family: "evm" },
  polygon: { chainId: 137, family: "evm" },
  solana: { chainId: DEFAULT_SOLANA_CHAIN_ID, family: "solana" },
  tron: { chainId: DEFAULT_TRON_CHAIN_ID, family: "tron" },
  bitcoin: { chainId: DEFAULT_BITCOIN_CHAIN_ID, family: "utxo" },
  ton: { chainId: DEFAULT_TON_CHAIN_ID, family: "ton" },
  arbitrum: { chainId: 42161, family: "evm" },
  optimism: { chainId: 10, family: "evm" },
  base: { chainId: 8453, family: "evm" },
  avalanche: { chainId: 43114, family: "evm" },
};

export function buildTokenDetailHref(input: TokenRouteInput): string {
  const symbol = input.symbol?.trim().toUpperCase() || "TOKEN";
  const chainRoute = resolveTokenRoute(input);
  const tokenAddress = normalizeTokenRouteAddress(input.tokenAddress);
  const params = new URLSearchParams({
    family: chainRoute.family,
    symbol,
  });

  if (input.name?.trim()) {
    params.set("name", input.name.trim());
  }

  return `/tokens/${encodeURIComponent(String(chainRoute.chainId))}/${encodeURIComponent(tokenAddress)}?${params.toString()}`;
}

export function buildExploreTokenHref(token: ExploreTokenItem): string {
  return buildTokenDetailHref({
    chainId: token.chainId,
    chainKey: token.chainKey,
    tokenAddress: token.tokenAddress,
    symbol: token.symbol,
    name: token.name,
  });
}

export function isEvmTokenDetailRoute(chainId: string | number, family?: ChainFamily | null): boolean {
  if (family && family !== "evm") {
    return false;
  }

  const parsed = typeof chainId === "number" ? chainId : Number(chainId);
  return Number.isFinite(parsed) && EVM_CHAINS.some((chain) => chain.chainId === parsed);
}

function resolveTokenRoute(input: TokenRouteInput): { chainId: number | string; family: ChainFamily } {
  if (input.chainId !== undefined && input.chainId !== null && String(input.chainId).trim()) {
    const family = resolveFamilyFromChainId(input.chainId)
      ?? resolveFamilyFromChainKey(input.chainKey)
      ?? resolveFamilyFromSymbol(input.symbol)
      ?? "evm";
    return { chainId: input.chainId, family };
  }

  const byChainKey = resolveRouteFromChainKey(input.chainKey);
  if (byChainKey) {
    return byChainKey;
  }

  return NATIVE_SYMBOL_ROUTES[input.symbol?.trim().toUpperCase() ?? ""] ?? {
    chainId: 1,
    family: "evm",
  };
}

function normalizeTokenRouteAddress(address?: string | null): string {
  const trimmed = address?.trim();
  return trimmed ? trimmed : "native";
}

function resolveRouteFromChainKey(chainKey?: string | null): { chainId: number | string; family: ChainFamily } | null {
  const key = chainKey?.trim().toLowerCase();
  return key ? CHAIN_KEY_ROUTES[key] ?? null : null;
}

function resolveFamilyFromChainKey(chainKey?: string | null): ChainFamily | null {
  return resolveRouteFromChainKey(chainKey)?.family ?? null;
}

function resolveFamilyFromSymbol(symbol?: string | null): ChainFamily | null {
  return NATIVE_SYMBOL_ROUTES[symbol?.trim().toUpperCase() ?? ""]?.family ?? null;
}

function resolveFamilyFromChainId(chainId: number | string): ChainFamily | null {
  const text = String(chainId);
  if (text === String(DEFAULT_SOLANA_CHAIN_ID)) return "solana";
  if (text === String(DEFAULT_TRON_CHAIN_ID)) return "tron";
  if (text === String(DEFAULT_BITCOIN_CHAIN_ID)) return "utxo";
  if (text === String(DEFAULT_TON_CHAIN_ID)) return "ton";
  const parsed = Number(text);
  return Number.isFinite(parsed) && EVM_CHAINS.some((chain) => chain.chainId === parsed)
    ? "evm"
    : null;
}

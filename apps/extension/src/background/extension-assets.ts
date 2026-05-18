import type {
  AssetBalance,
  AssetRef,
  ChainId,
} from "@acorus/shared";
import {
  listExtensionNetworks,
  resolveExtensionNetwork,
  type ExtensionNetwork,
} from "./extension-chain-registry";
import { readStorageValue, writeStorageValue } from "./extension-storage";
import { getExtensionVaultStatus } from "./extension-wallet";

export type WatchedAsset = AssetRef & {
  id: string;
  addedAt: string;
  hidden?: boolean;
};

export type ExtensionPortfolioSnapshot = {
  updatedAt: string;
  totalFiatValue: number | null;
  activeChainId: ChainId;
  networks: ExtensionNetwork[];
  assets: AssetBalance[];
  warnings: string[];
};

const WATCHED_ASSETS_KEY = "acorus_extension_watched_assets";
const HIDDEN_ASSET_IDS_KEY = "acorus_extension_hidden_assets";
const ERC20_BALANCE_OF_SELECTOR = "0x70a08231";
const DEFAULT_PUBLIC_EVM_RPCS: Record<number, string> = {
  1: "https://ethereum-rpc.publicnode.com",
  10: "https://optimism-rpc.publicnode.com",
  56: "https://bsc-rpc.publicnode.com",
  137: "https://polygon-bor-rpc.publicnode.com",
  204: "https://opbnb-rpc.publicnode.com",
  250: "https://fantom-rpc.publicnode.com",
  324: "https://zksync-era-rpc.publicnode.com",
  1329: "https://sei-evm-rpc.publicnode.com",
  8453: "https://base-rpc.publicnode.com",
  42161: "https://arbitrum-one-rpc.publicnode.com",
  43114: "https://avalanche-c-chain-rpc.publicnode.com",
  59144: "https://linea-rpc.publicnode.com",
};

export async function listWatchedAssets(): Promise<WatchedAsset[]> {
  return readStorageValue<WatchedAsset[]>(WATCHED_ASSETS_KEY, []);
}

export async function watchAsset(input: AssetRef): Promise<WatchedAsset> {
  validateAssetRef(input);

  const watched: WatchedAsset = {
    ...input,
    id: buildAssetId(input),
    addedAt: new Date().toISOString(),
    hidden: false,
  };

  const current = await listWatchedAssets();
  const next = [
    ...current.filter((item) => item.id !== watched.id),
    watched,
  ];

  await writeStorageValue(WATCHED_ASSETS_KEY, next);
  return watched;
}

export async function hideAsset(assetId: string): Promise<string[]> {
  const current = await readStorageValue<string[]>(HIDDEN_ASSET_IDS_KEY, []);
  const next = Array.from(new Set([...current, assetId]));
  await writeStorageValue(HIDDEN_ASSET_IDS_KEY, next);
  return next;
}

export async function unhideAsset(assetId: string): Promise<string[]> {
  const current = await readStorageValue<string[]>(HIDDEN_ASSET_IDS_KEY, []);
  const next = current.filter((item) => item !== assetId);
  await writeStorageValue(HIDDEN_ASSET_IDS_KEY, next);
  return next;
}

export async function buildExtensionPortfolioSnapshot(input?: {
  activeChainId?: ChainId;
}): Promise<ExtensionPortfolioSnapshot> {
  const vault = await getExtensionVaultStatus();
  const networks = await listExtensionNetworks();
  const watched = await listWatchedAssets();
  const hidden = new Set(await readStorageValue<string[]>(HIDDEN_ASSET_IDS_KEY, []));
  const activeChainId = input?.activeChainId ?? networks[0]?.chainId ?? 1;
  const warnings: string[] = [];
  const assets: AssetBalance[] = [];

  for (const network of networks) {
    const profile = vault.profiles.find((item) => item.chainFamily === network.family);

    if (!profile) {
      continue;
    }

    const nativeAsset = buildNativeAsset(network);
    const nativeId = buildAssetId(nativeAsset);

    if (!hidden.has(nativeId)) {
      assets.push(await resolveAssetBalance({
        asset: nativeAsset,
        ownerAddress: profile.account,
        network,
        warnings,
      }));
    }
  }

  for (const asset of watched) {
    if (hidden.has(asset.id) || asset.hidden) {
      continue;
    }

    const network = await resolveExtensionNetwork(asset.chainId);
    const profile = vault.profiles.find((item) => item.chainFamily === asset.family);

    if (!network || !profile) {
      continue;
    }

    assets.push(await resolveAssetBalance({
      asset,
      ownerAddress: profile.account,
      network,
      warnings,
    }));
  }

  const values = assets
    .map((asset) => asset.fiatValue)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return {
    updatedAt: new Date().toISOString(),
    totalFiatValue: values.length
      ? values.reduce((sum, value) => sum + value, 0)
      : null,
    activeChainId,
    networks,
    assets,
    warnings,
  };
}

export function buildAssetId(
  asset: Pick<AssetRef, "family" | "chainId" | "type" | "symbol" | "tokenAddress">,
): string {
  return [
    asset.family,
    String(asset.chainId),
    asset.type,
    asset.tokenAddress?.toLowerCase() ?? "native",
    asset.symbol.toUpperCase(),
  ].join(":");
}

function buildNativeAsset(network: ExtensionNetwork): AssetRef {
  return {
    family: network.family,
    chainId: network.chainId,
    type: network.family === "utxo" ? "utxo" : "native",
    symbol: network.nativeSymbol,
    name: network.name,
    decimals: network.family === "utxo"
      ? 8
      : network.family === "solana"
        ? 9
        : 18,
    tokenAddress: null,
    isVerified: true,
  };
}

async function resolveAssetBalance(input: {
  asset: AssetRef;
  ownerAddress: string;
  network: ExtensionNetwork;
  warnings: string[];
}): Promise<AssetBalance> {
  const { asset, ownerAddress, network, warnings } = input;

  if (network.family !== "evm") {
    warnings.push(`${network.name}: live balance is not enabled in extension yet.`);
    return {
      ...asset,
      balanceRaw: "0",
      balanceFormatted: "0",
      fiatValue: null,
      priceUsd: null,
      source: network.capabilities.balance ? "unavailable" : "skeleton",
    };
  }

  try {
    if (asset.type === "native") {
      const raw = await fetchEvmNativeBalance(
        resolveRpcUrl(network),
        ownerAddress,
      );

      return {
        ...asset,
        balanceRaw: raw.toString(),
        balanceFormatted: formatUnits(raw, asset.decimals),
        fiatValue: null,
        priceUsd: null,
        source: "live_rpc",
      };
    }

    if (asset.type === "erc20" && asset.tokenAddress) {
      const raw = await fetchErc20Balance(
        resolveRpcUrl(network),
        asset.tokenAddress,
        ownerAddress,
      );

      return {
        ...asset,
        balanceRaw: raw.toString(),
        balanceFormatted: formatUnits(raw, asset.decimals),
        fiatValue: null,
        priceUsd: null,
        source: "live_rpc",
      };
    }
  } catch (error) {
    warnings.push(
      `${network.name}: ${error instanceof Error ? error.message : "balance unavailable"}`,
    );
  }

  return {
    ...asset,
    balanceRaw: "0",
    balanceFormatted: "0",
    fiatValue: null,
    priceUsd: null,
    source: "unavailable",
  };
}

function resolveRpcUrl(network: ExtensionNetwork): string {
  const rpcUrl = network.rpcUrl ?? DEFAULT_PUBLIC_EVM_RPCS[Number(network.chainId)];

  if (!rpcUrl) {
    throw new Error("RPC is not configured for this network.");
  }

  return rpcUrl;
}

async function fetchEvmNativeBalance(
  rpcUrl: string,
  ownerAddress: string,
): Promise<bigint> {
  const result = await fetchJsonRpc<string>(rpcUrl, "eth_getBalance", [
    ownerAddress,
    "latest",
  ]);
  return BigInt(result ?? "0x0");
}

async function fetchErc20Balance(
  rpcUrl: string,
  tokenAddress: string,
  ownerAddress: string,
): Promise<bigint> {
  const result = await fetchJsonRpc<string>(rpcUrl, "eth_call", [
    {
      to: tokenAddress,
      data: encodeErc20BalanceOf(ownerAddress),
    },
    "latest",
  ]);
  return BigInt(result ?? "0x0");
}

async function fetchJsonRpc<T>(
  rpcUrl: string,
  method: string,
  params: unknown[],
): Promise<T | null> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error("RPC endpoint did not respond.");
  }

  const payload = await response.json() as { result?: T; error?: { message?: string } };

  if (payload.error) {
    throw new Error(payload.error.message ?? "RPC call failed.");
  }

  return payload.result ?? null;
}

function encodeErc20BalanceOf(ownerAddress: string): `0x${string}` {
  return `${ERC20_BALANCE_OF_SELECTOR}${ownerAddress.toLowerCase().replace(/^0x/u, "").padStart(64, "0")}` as `0x${string}`;
}

function validateAssetRef(input: AssetRef): void {
  if (!input.symbol.trim()) {
    throw new Error("Asset symbol is required.");
  }

  if (!input.name.trim()) {
    throw new Error("Asset name is required.");
  }

  if (!Number.isInteger(input.decimals) || input.decimals < 0 || input.decimals > 30) {
    throw new Error("Asset decimals are invalid.");
  }

  if (input.type === "erc20" && !looksLikeEvmAddress(input.tokenAddress)) {
    throw new Error("ERC-20 token address is invalid.");
  }
}

function looksLikeEvmAddress(value: unknown): value is string {
  return typeof value === "string" && /^0x[0-9a-f]{40}$/iu.test(value);
}

function formatUnits(value: bigint, decimals: number): string {
  const negative = value < 0n;
  const raw = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = raw % base;
  const fractionText = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/u, "")
    .slice(0, 6);

  return `${negative ? "-" : ""}${whole.toString()}${fractionText ? `.${fractionText}` : ""}`;
}

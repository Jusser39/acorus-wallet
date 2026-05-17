import type { ChainFamily, ChainId } from "./multichain";
import {
  DEFAULT_BITCOIN_CHAIN_ID,
  DEFAULT_EVM_CHAIN_ID,
  DEFAULT_SOLANA_CHAIN_ID,
  DEFAULT_TRON_CHAIN_ID,
  getUniversalChain,
} from "./chains";

export type UniversalCapabilityKey =
  | "create"
  | "import"
  | "view_only"
  | "receive"
  | "native_balance"
  | "token_balance"
  | "history"
  | "send_native"
  | "send_token"
  | "send_nft"
  | "burn_nft"
  | "swap"
  | "crosschain_swap"
  | "dapp_browser"
  | "wallet_connect"
  | "contacts"
  | "quests"
  | "practice";

export type UniversalCapabilityStatus =
  | "live"
  | "preview"
  | "planned"
  | "blocked";

export interface UniversalCapability {
  key: UniversalCapabilityKey;
  status: UniversalCapabilityStatus;
  label: string;
  note: string;
}

export interface ChainCapabilityProfile {
  family: ChainFamily;
  chainId: ChainId;
  name: string;
  nativeSymbol: string;
  capabilities: UniversalCapability[];
}

const capabilityLabels: Record<UniversalCapabilityKey, string> = {
  create: "Create",
  import: "Import",
  view_only: "View-only",
  receive: "Receive",
  native_balance: "Native balance",
  token_balance: "Token balance",
  history: "History",
  send_native: "Native send",
  send_token: "Token send",
  send_nft: "NFT send",
  burn_nft: "NFT burn",
  swap: "Swap",
  crosschain_swap: "Cross-chain swap",
  dapp_browser: "dApp browser",
  wallet_connect: "WalletConnect",
  contacts: "Contacts",
  quests: "Quests",
  practice: "Practice",
};

const defaultNotes: Record<UniversalCapabilityStatus, string> = {
  live: "Available in the current wallet flow.",
  preview: "UI and validation shell are available; real execution is gated.",
  planned: "Planned behind the universal adapter contract.",
  blocked: "Blocked for this chain family or profile type.",
};

function capability(
  key: UniversalCapabilityKey,
  status: UniversalCapabilityStatus,
  note = defaultNotes[status],
): UniversalCapability {
  return {
    key,
    status,
    label: capabilityLabels[key],
    note,
  };
}

function baseCapabilities(): UniversalCapability[] {
  return [
    capability("create", "live"),
    capability("import", "live"),
    capability("view_only", "live"),
    capability("receive", "live"),
    capability("contacts", "live"),
    capability("quests", "preview"),
    capability("practice", "live"),
  ];
}

function familyCapabilities(family: ChainFamily): UniversalCapability[] {
  switch (family) {
    case "evm":
      return [
        capability("native_balance", "live"),
        capability("token_balance", "live"),
        capability("history", "live"),
        capability("send_native", "live"),
        capability("send_token", "live"),
        capability("send_nft", "preview"),
        capability("burn_nft", "preview"),
        capability("swap", "preview", "Route quotes are available; execution is staged."),
        capability("crosschain_swap", "planned"),
        capability("dapp_browser", "preview"),
        capability("wallet_connect", "preview"),
      ];
    case "solana":
      return [
        capability("native_balance", "live"),
        capability("token_balance", "live"),
        capability("history", "preview"),
        capability("send_native", "preview"),
        capability("send_token", "preview"),
        capability("send_nft", "preview"),
        capability("burn_nft", "preview"),
        capability("swap", "preview"),
        capability("crosschain_swap", "planned"),
        capability("dapp_browser", "planned"),
        capability("wallet_connect", "preview"),
      ];
    case "tron":
      return [
        capability("native_balance", "planned"),
        capability("token_balance", "planned"),
        capability("history", "planned"),
        capability("send_native", "preview"),
        capability("send_token", "preview"),
        capability("send_nft", "planned"),
        capability("burn_nft", "planned"),
        capability("swap", "planned"),
        capability("crosschain_swap", "planned"),
        capability("dapp_browser", "planned"),
        capability("wallet_connect", "planned"),
      ];
    case "utxo":
      return [
        capability("native_balance", "planned"),
        capability("token_balance", "blocked", "UTXO chains do not expose account tokens like smart-contract networks."),
        capability("history", "planned"),
        capability("send_native", "preview"),
        capability("send_token", "blocked"),
        capability("send_nft", "blocked"),
        capability("burn_nft", "blocked"),
        capability("swap", "planned"),
        capability("crosschain_swap", "planned"),
        capability("dapp_browser", "blocked"),
        capability("wallet_connect", "blocked"),
      ];
    case "ton":
    default:
      return [
        capability("native_balance", "planned"),
        capability("token_balance", "planned"),
        capability("history", "planned"),
        capability("send_native", "planned"),
        capability("send_token", "planned"),
        capability("send_nft", "planned"),
        capability("burn_nft", "planned"),
        capability("swap", "planned"),
        capability("crosschain_swap", "planned"),
        capability("dapp_browser", "planned"),
        capability("wallet_connect", "planned"),
      ];
  }
}

export function getDefaultCapabilityChainId(family: ChainFamily): ChainId {
  if (family === "solana") return DEFAULT_SOLANA_CHAIN_ID;
  if (family === "tron") return DEFAULT_TRON_CHAIN_ID;
  if (family === "utxo") return DEFAULT_BITCOIN_CHAIN_ID;
  return DEFAULT_EVM_CHAIN_ID;
}

export function getChainCapabilityProfile(input: {
  family: ChainFamily;
  chainId?: ChainId;
}): ChainCapabilityProfile {
  const chainId = input.chainId ?? getDefaultCapabilityChainId(input.family);
  const chain = getUniversalChain({ family: input.family, chainId });

  return {
    family: input.family,
    chainId,
    name: chain?.name ?? input.family.toUpperCase(),
    nativeSymbol: chain?.nativeSymbol ?? "",
    capabilities: [...baseCapabilities(), ...familyCapabilities(input.family)],
  };
}

export function getCapabilityStatus(
  profile: ChainCapabilityProfile,
  key: UniversalCapabilityKey,
): UniversalCapabilityStatus {
  return profile.capabilities.find((item) => item.key === key)?.status ?? "planned";
}

export function summarizeCapabilityProfile(profile: ChainCapabilityProfile): {
  live: number;
  preview: number;
  planned: number;
  blocked: number;
} {
  return profile.capabilities.reduce(
    (summary, item) => ({
      ...summary,
      [item.status]: summary[item.status] + 1,
    }),
    {
      live: 0,
      preview: 0,
      planned: 0,
      blocked: 0,
    },
  );
}

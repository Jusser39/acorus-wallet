import type { ChainFamily } from "@acorus/shared";

export type NftStandard = "erc721" | "erc1155" | "spl" | "compressed_spl";
export type NftActionStatus = "enabled" | "preview" | "disabled";

export interface NftCollectible {
  id: string;
  family: ChainFamily;
  chainId: number | string;
  chainName: string;
  standard: NftStandard;
  contractAddress: string;
  tokenId: string;
  name: string;
  collection: string;
  description: string;
  mediaTone: string;
  imageUrl?: string | null;
  floorPriceLabel: string | null;
  lastTransferLabel: string | null;
  rarityLabel: string | null;
  isSpam: boolean;
  isVerified: boolean;
  sendStatus: NftActionStatus;
  burnStatus: NftActionStatus;
  explorerUrl: string;
}

export interface NftCollectionSummary {
  total: number;
  verified: number;
  spam: number;
  sendReady: number;
  previewOnly: number;
}

export type NftFilter = "all" | "verified" | "sendable" | "spam";

const DEMO_NFTS: NftCollectible[] = [
  {
    id: "eth-acorus-001",
    family: "evm",
    chainId: 1,
    chainName: "Ethereum",
    standard: "erc721",
    contractAddress: "0x1111111111111111111111111111111111111111",
    tokenId: "1",
    name: "Acorus Genesis #001",
    collection: "Acorus Genesis",
    description: "Early access identity collectible for the Acorus wallet beta.",
    mediaTone: "from-violet-600 via-fuchsia-500 to-sky-500",
    floorPriceLabel: "0.42 ETH",
    lastTransferLabel: "2 days ago",
    rarityLabel: "Top 3%",
    isSpam: false,
    isVerified: true,
    sendStatus: "preview",
    burnStatus: "preview",
    explorerUrl: "https://etherscan.io/token/0x1111111111111111111111111111111111111111?a=1",
  },
  {
    id: "base-builder-042",
    family: "evm",
    chainId: 8453,
    chainName: "Base",
    standard: "erc721",
    contractAddress: "0x2222222222222222222222222222222222222222",
    tokenId: "42",
    name: "Builder Pass #042",
    collection: "Acorus Builders",
    description: "Utility pass for future quests, partner drops and app testing.",
    mediaTone: "from-cyan-500 via-blue-500 to-emerald-400",
    floorPriceLabel: "0.08 ETH",
    lastTransferLabel: "12 days ago",
    rarityLabel: "Rare",
    isSpam: false,
    isVerified: true,
    sendStatus: "preview",
    burnStatus: "preview",
    explorerUrl: "https://basescan.org/token/0x2222222222222222222222222222222222222222?a=42",
  },
  {
    id: "polygon-airdrop-9",
    family: "evm",
    chainId: 137,
    chainName: "Polygon",
    standard: "erc1155",
    contractAddress: "0x3333333333333333333333333333333333333333",
    tokenId: "9",
    name: "Unknown Voucher #9",
    collection: "Unverified Airdrops",
    description: "A suspicious airdrop. Hidden by default once live spam scoring is connected.",
    mediaTone: "from-slate-700 via-slate-600 to-rose-500",
    floorPriceLabel: null,
    lastTransferLabel: "Today",
    rarityLabel: null,
    isSpam: true,
    isVerified: false,
    sendStatus: "disabled",
    burnStatus: "preview",
    explorerUrl: "https://polygonscan.com/token/0x3333333333333333333333333333333333333333?a=9",
  },
  {
    id: "solana-compressed-17",
    family: "solana",
    chainId: 101,
    chainName: "Solana",
    standard: "compressed_spl",
    contractAddress: "CnftMerkleTree111111111111111111111111111111",
    tokenId: "17",
    name: "Compressed Bloom #17",
    collection: "Solana Blooms",
    description: "Compressed NFT preview for the Solana collectibles pipeline.",
    mediaTone: "from-purple-500 via-lime-400 to-teal-500",
    floorPriceLabel: "1.8 SOL",
    lastTransferLabel: "5 days ago",
    rarityLabel: "Uncommon",
    isSpam: false,
    isVerified: true,
    sendStatus: "preview",
    burnStatus: "preview",
    explorerUrl: "https://solscan.io/token/CnftMerkleTree111111111111111111111111111111",
  },
  {
    id: "solana-metaplex-88",
    family: "solana",
    chainId: 101,
    chainName: "Solana",
    standard: "spl",
    contractAddress: "MetaplexMint1111111111111111111111111111111",
    tokenId: "88",
    name: "Acorus Drift #088",
    collection: "Acorus Drift",
    description: "Metaplex NFT preview with receive and display readiness.",
    mediaTone: "from-orange-400 via-pink-500 to-indigo-500",
    floorPriceLabel: "0.7 SOL",
    lastTransferLabel: "1 month ago",
    rarityLabel: "Common",
    isSpam: false,
    isVerified: true,
    sendStatus: "preview",
    burnStatus: "preview",
    explorerUrl: "https://solscan.io/token/MetaplexMint1111111111111111111111111111111",
  },
];

export function getNftsForFamily(family: ChainFamily | null | undefined): NftCollectible[] {
  if (!family) {
    return DEMO_NFTS;
  }

  if (family === "tron" || family === "utxo" || family === "ton") {
    return [];
  }

  return DEMO_NFTS.filter((nft) => nft.family === family);
}

export function filterNfts(items: NftCollectible[], filter: NftFilter): NftCollectible[] {
  switch (filter) {
    case "verified":
      return items.filter((item) => item.isVerified && !item.isSpam);
    case "sendable":
      return items.filter((item) => item.sendStatus !== "disabled" && !item.isSpam);
    case "spam":
      return items.filter((item) => item.isSpam);
    case "all":
    default:
      return items;
  }
}

export function summarizeNfts(items: NftCollectible[]): NftCollectionSummary {
  return {
    total: items.length,
    verified: items.filter((item) => item.isVerified && !item.isSpam).length,
    spam: items.filter((item) => item.isSpam).length,
    sendReady: items.filter((item) => item.sendStatus === "enabled").length,
    previewOnly: items.filter((item) => item.sendStatus === "preview" || item.burnStatus === "preview").length,
  };
}

export function getNftActionLabel(status: NftActionStatus, action: "send" | "burn"): string {
  if (status === "enabled") {
    return action === "send" ? "Send NFT" : "Burn NFT";
  }

  if (status === "preview") {
    return action === "send" ? "Preview send" : "Preview burn";
  }

  return action === "send" ? "Send disabled" : "Burn disabled";
}

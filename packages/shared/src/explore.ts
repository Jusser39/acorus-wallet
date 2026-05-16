export type ExploreSection = "trending" | "top" | "memes";

export type ExploreTokenItem = {
  id: string;
  symbol: string;
  name: string;
  logoUrl?: string | null;
  price?: number | null;
  change24h?: number | null;
  marketCapUsd?: number | null;
  volume24hUsd?: number | null;
  chainId?: number | null;
  tokenAddress?: string | null;
  pairUrl?: string | null;
  riskLevel?: "low" | "medium" | "high" | "unknown";
  riskFlags?: string[];
  rank?: number | null;
  trendingScore?: number | null;
  source?: string;
};

export type ExploreFeedResponse = {
  ok: boolean;
  section: ExploreSection;
  items: ExploreTokenItem[];
  source: string;
  sourceStatus: "live" | "mock" | "cached";
  updatedAt: string;
};

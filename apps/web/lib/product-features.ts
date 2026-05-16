export type ProductFeatureStatus =
  | "live"
  | "preview"
  | "planned"
  | "disabled";

export type ProductFeature = {
  id: string;
  title: string;
  description: string;
  href: string;
  status: ProductFeatureStatus;
  badge: string;
};

export const WALLET_ACTION_FEATURES: ProductFeature[] = [
  {
    id: "send",
    title: "Send",
    description: "Prepare and send assets through the universal send flow.",
    href: "/send",
    status: "live",
    badge: "Universal",
  },
  {
    id: "receive",
    title: "Receive",
    description: "Receive assets on supported networks.",
    href: "/receive",
    status: "live",
    badge: "Multichain",
  },
  {
    id: "swap",
    title: "Swap",
    description: "Preview swap routes across networks. Execution comes later.",
    href: "/swap",
    status: "preview",
    badge: "Quote only",
  },
  {
    id: "explore",
    title: "Explore",
    description: "Discover tokens, protocols, memes, quests and launches.",
    href: "/explore",
    status: "preview",
    badge: "Shell",
  },
  {
    id: "security",
    title: "Security",
    description: "Review wallet safety, backup, autolock and permissions.",
    href: "/security",
    status: "preview",
    badge: "Safety",
  },
  {
    id: "dapps",
    title: "dApps",
    description: "Preview-backed dApp bridge with connect/chain reads, window.ethereum compatibility, and approval review.",
    href: "/dapps",
    status: "preview",
    badge: "Approval preview",
  },
  {
    id: "extension",
    title: "Chrome Extension",
    description: "Browser wallet bridge with preview-backed window.ethereum compatibility and explicit dApp approval review.",
    href: "/extension",
    status: "preview",
    badge: "Preview bridge",
  },
  {
    id: "quests",
    title: "Quests",
    description: "Gamified onboarding and Web3 tasks inspired by DeFi apps.",
    href: "/quests",
    status: "planned",
    badge: "Later",
  },
];

export function getFeatureStatusLabel(status: ProductFeatureStatus): string {
  if (status === "live") return "Live";
  if (status === "preview") return "Preview";
  if (status === "planned") return "Planned";
  return "Disabled";
}

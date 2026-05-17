import type { ChainFamily, WalletProfileRecord } from "@acorus/shared";

export type WalletHealthSeverity = "good" | "info" | "warning" | "danger";

export interface WalletHealthIssue {
  id: string;
  label: string;
  severity: WalletHealthSeverity;
  actionHref?: string;
  actionLabel?: string;
}

export interface WalletHealthSummary {
  score: number;
  label: string;
  issues: WalletHealthIssue[];
}

function chainLabel(family: ChainFamily): string {
  switch (family) {
    case "evm":
      return "EVM";
    case "solana":
      return "Solana";
    case "tron":
      return "Tron";
    case "utxo":
      return "Bitcoin";
    case "ton":
      return "TON";
    default:
      return family;
  }
}

export function buildWalletHealthSummary(input: {
  profile: WalletProfileRecord;
  isUnlocked: boolean;
  safetyMode: boolean;
  hasEncryptedVault: boolean;
}): WalletHealthSummary {
  const issues: WalletHealthIssue[] = [];

  if (input.profile.type === "local" && !input.isUnlocked) {
    issues.push({
      id: "locked",
      label: "Wallet is locked. Unlock before signing or deriving sibling profiles.",
      severity: "warning",
      actionHref: "/unlock",
      actionLabel: "Unlock",
    });
  }

  if (input.profile.type === "local" && !input.hasEncryptedVault) {
    issues.push({
      id: "missing-vault",
      label: "Encrypted vault is missing on this device.",
      severity: "danger",
      actionHref: "/import",
      actionLabel: "Import",
    });
  }

  if (input.profile.type === "view_only") {
    issues.push({
      id: "view-only",
      label: "View-only profile can receive and track assets, but cannot send.",
      severity: "info",
      actionHref: "/view-only",
      actionLabel: "Add profile",
    });
  }

  if (input.profile.type === "local" && input.safetyMode) {
    issues.push({
      id: "safety-mode",
      label: "Safety mode blocks real mainnet sends until you disable it.",
      severity: "info",
      actionHref: "/settings",
      actionLabel: "Settings",
    });
  }

  if (input.profile.chainFamily === "tron" || input.profile.chainFamily === "utxo" || input.profile.chainFamily === "ton") {
    issues.push({
      id: "skeleton-chain",
      label: `${chainLabel(input.profile.chainFamily)} support is in receive/view-only preview mode.`,
      severity: "warning",
      actionHref: "/receive",
      actionLabel: "Receive",
    });
  }

  if (input.profile.chainFamily === "solana") {
    issues.push({
      id: "solana-send-preview",
      label: "Solana portfolio and receive are active; real send is still staged behind preview flows.",
      severity: "info",
      actionHref: "/send",
      actionLabel: "Preview send",
    });
  }

  const penalty = issues.reduce((score, issue) => {
    if (issue.severity === "danger") return score + 40;
    if (issue.severity === "warning") return score + 20;
    if (issue.severity === "info") return score + 8;
    return score;
  }, 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const label =
    score >= 85 ? "Ready"
    : score >= 65 ? "Needs attention"
    : score >= 40 ? "Limited"
    : "At risk";

  return {
    score,
    label,
    issues,
  };
}

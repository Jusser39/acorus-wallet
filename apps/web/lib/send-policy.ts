import type { ChainFamily, WalletProfileType } from "@acorus/shared";

export function canWalletSend(
  profileType: WalletProfileType,
  isUnlocked: boolean,
): boolean {
  if (profileType === "view_only") {
    return false;
  }

  if (profileType === "practice") {
    return true;
  }

  return isUnlocked;
}

export function isSafetyModeBlockingRealSend(
  profileType: WalletProfileType,
  safetyMode: boolean,
): boolean {
  return profileType === "local" && safetyMode;
}

export type SendAvailability = {
  canSend: boolean;
  reason?: string;
  ctaLabel: string;
};

export function getSendAvailability(input: {
  profileType: WalletProfileType;
  chainFamily: ChainFamily;
  isUnlocked: boolean;
  safetyMode?: boolean;
}): SendAvailability {
  const { profileType, chainFamily, isUnlocked, safetyMode } = input;

  if (profileType === "view_only") {
    return {
      canSend: false,
      reason: "View-only wallet cannot send transactions.",
      ctaLabel: "Send disabled",
    };
  }

  if (chainFamily === "solana") {
    if (profileType === "practice") {
      return { canSend: true, ctaLabel: "Send SOL (practice)" };
    }

    if (!isUnlocked) {
      return {
        canSend: false,
        reason: "Unlock your wallet to send SOL.",
        ctaLabel: "Unlock to send SOL",
      };
    }

    return { canSend: true, ctaLabel: "Send SOL" };
  }

  if (chainFamily === "tron") {
    return {
      canSend: false,
      reason: "Tron send is not yet implemented.",
      ctaLabel: "Tron send not implemented",
    };
  }

  if (chainFamily === "utxo") {
    return {
      canSend: false,
      reason: "Bitcoin send is not yet implemented.",
      ctaLabel: "Bitcoin send not implemented",
    };
  }

  if (chainFamily === "ton") {
    return {
      canSend: false,
      reason: "TON send is not yet implemented.",
      ctaLabel: "TON send not implemented",
    };
  }

  // EVM path
  if (profileType === "practice") {
    return { canSend: true, ctaLabel: "Send (practice)" };
  }

  if (!isUnlocked) {
    return {
      canSend: false,
      reason: "Unlock your wallet to send.",
      ctaLabel: "Unlock to send",
    };
  }

  if (safetyMode) {
    return {
      canSend: false,
      reason: "Safety mode is enabled — disable it to send on mainnet.",
      ctaLabel: "Safety mode on",
    };
  }

  return { canSend: true, ctaLabel: "Send" };
}

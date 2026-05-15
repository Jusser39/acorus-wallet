import type { WalletProfileType } from "@acorus/shared";

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

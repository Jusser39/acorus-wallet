import type { BackgroundStateSnapshot } from "../shared/protocol";
import type { ExtensionPortfolioSnapshot } from "../background/extension-assets";

export async function getBackgroundState(): Promise<BackgroundStateSnapshot | null> {
  try {
    const response = await chrome.runtime.sendMessage({
      kind: "get_state",
      requestId: "ui_get_state_" + Date.now(),
      origin: window.location.origin,
    });
    if (response?.ok) {
      return response.result as BackgroundStateSnapshot;
    }
  } catch (error) {
    console.error("Failed to get background state", error);
  }
  return null;
}

export async function getExtensionHome(): Promise<ExtensionPortfolioSnapshot | null> {
  try {
    const response = await chrome.runtime.sendMessage({
      kind: "get_extension_home",
      requestId: "ui_get_home_" + Date.now(),
    });
    if (response?.ok) {
      return response.result as ExtensionPortfolioSnapshot;
    }
  } catch (error) {
    console.error("Failed to get extension home", error);
  }
  return null;
}

import type { BackgroundStateSnapshot } from "../shared/protocol";
import type { ExtensionPortfolioSnapshot } from "../background/extension-assets";

export async function getBackgroundState(): Promise<BackgroundStateSnapshot | null> {
  try {
    const response: any = await chrome.runtime.sendMessage({
      kind: "get_state",
      requestId: "ui_get_state_" + Date.now(),
      surface: "popup",
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

export async function getExtensionHome(): Promise<any> {
  try {
    const response: any = await chrome.runtime.sendMessage({
      kind: "get_extension_home",
      surface: "popup",
      requestId: "ui_get_home_" + Date.now(),
    });
    return response;
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export async function createWallet(name: string, passcode: string): Promise<any> {
  return chrome.runtime.sendMessage({
    kind: "create_wallet",
    surface: "popup",
    requestId: "ui_create_" + Date.now(),
    name,
    passcode
  });
}

export async function importWallet(name: string, mnemonic: string, passcode: string): Promise<any> {
  return chrome.runtime.sendMessage({
    kind: "import_wallet",
    surface: "popup",
    requestId: "ui_import_" + Date.now(),
    name,
    mnemonic,
    passcode
  });
}

export async function unlockWallet(passcode: string): Promise<any> {
  return chrome.runtime.sendMessage({
    kind: "unlock_wallet",
    surface: "popup",
    requestId: "ui_unlock_" + Date.now(),
    passcode
  });
}

export async function lockWallet(): Promise<any> {
  return chrome.runtime.sendMessage({
    kind: "lock_wallet",
    surface: "popup",
    requestId: "ui_lock_" + Date.now()
  });
}

export async function resetWallet(): Promise<any> {
  return chrome.runtime.sendMessage({
    kind: "reset_extension_wallet",
    surface: "popup",
    requestId: "ui_reset_" + Date.now()
  });
}

export async function revokeSession(sessionId: string): Promise<any> {
  return chrome.runtime.sendMessage({
    kind: "revoke_session",
    surface: "popup",
    requestId: "ui_revoke_" + Date.now(),
    sessionId
  });
}

export async function sendInternalTransaction(to: string, value: string, chainId: number): Promise<any> {
  return chrome.runtime.sendMessage({
    kind: "send_internal_transaction",
    surface: "popup",
    requestId: "ui_send_" + Date.now(),
    to,
    value,
    chainId
  });
}


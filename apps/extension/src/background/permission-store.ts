import type { ConnectedSitePermission } from "../shared/protocol";

const CONNECTED_SITES_KEY = "acorus_connected_sites";

export async function listConnectedSites(): Promise<ConnectedSitePermission[]> {
  const result = await chrome.storage.local.get(CONNECTED_SITES_KEY);
  const value = result[CONNECTED_SITES_KEY];

  return Array.isArray(value) ? (value as ConnectedSitePermission[]) : [];
}

export async function initializePermissionStore(): Promise<void> {
  const current = await listConnectedSites();

  if (current.length === 0) {
    await chrome.storage.local.set({
      [CONNECTED_SITES_KEY]: [],
    });
  }
}

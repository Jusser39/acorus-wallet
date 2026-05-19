import type { ExtensionActivityRecord } from "../shared/protocol";

const EXTENSION_ACTIVITY_KEY = "acorus_extension_activity";
const MAX_ACTIVITY_RECORDS = 20;

export async function listExtensionActivity(): Promise<ExtensionActivityRecord[]> {
  const result = await chrome.storage.local.get(EXTENSION_ACTIVITY_KEY);
  const items = result[EXTENSION_ACTIVITY_KEY];
  return Array.isArray(items) ? items as ExtensionActivityRecord[] : [];
}

export async function appendExtensionActivity(
  entry: ExtensionActivityRecord,
): Promise<ExtensionActivityRecord[]> {
  const current = await listExtensionActivity();
  const next = [entry, ...current].slice(0, MAX_ACTIVITY_RECORDS);
  await chrome.storage.local.set({
    [EXTENSION_ACTIVITY_KEY]: next,
  });
  return next;
}

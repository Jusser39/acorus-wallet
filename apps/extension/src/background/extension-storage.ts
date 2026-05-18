export async function readStorageValue<T>(
  key: string,
  fallback: T,
): Promise<T> {
  const result = await chrome.storage.local.get(key);
  const value = result[key];

  if (value === undefined || value === null) {
    return fallback;
  }

  return value as T;
}

export async function writeStorageValue<T>(
  key: string,
  value: T,
): Promise<T> {
  await chrome.storage.local.set({ [key]: value });
  return value;
}

export async function updateStorageValue<T>(
  key: string,
  fallback: T,
  updater: (current: T) => T,
): Promise<T> {
  const current = await readStorageValue<T>(key, fallback);
  const next = updater(current);
  await writeStorageValue(key, next);
  return next;
}

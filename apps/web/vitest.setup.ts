import { beforeEach } from "vitest";

beforeEach(() => {
  ensureLocalStorage();
});

function ensureLocalStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (window.localStorage) {
      return;
    }
  } catch {
    // Restore below when jsdom exposes an inaccessible storage object.
  }

  const storage = new Map<string, string>();

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear() {
        storage.clear();
      },
      getItem(key: string) {
        return storage.has(key) ? storage.get(key)! : null;
      },
      key(index: number) {
        return Array.from(storage.keys())[index] ?? null;
      },
      get length() {
        return storage.size;
      },
      removeItem(key: string) {
        storage.delete(key);
      },
      setItem(key: string, value: string) {
        storage.set(key, String(value));
      },
    },
  });
}

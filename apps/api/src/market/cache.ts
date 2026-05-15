export interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class MarketCache<T> {
  private readonly ttlMs: number;
  private readonly cache = new Map<string, CacheEntry<T>>();

  constructor(ttlSec: number) {
    this.ttlMs = ttlSec * 1000;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    const age = Date.now() - entry.timestamp;
    if (age > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  getAge(key: string): number | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }
    return Date.now() - entry.timestamp;
  }
}

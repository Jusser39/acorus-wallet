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

  /** Returns the value only if it is within the fresh TTL window. */
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

  /**
   * Returns the value even when expired (for stale-cache fallback), along with
   * its age in milliseconds.  Returns undefined if the key was never set.
   */
  getStale(key: string): { value: T; ageMs: number } | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    return { value: entry.value, ageMs: Date.now() - entry.timestamp };
  }

  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  isFresh(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return Date.now() - entry.timestamp < this.ttlMs;
  }

  getAge(key: string): number | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }
    return Date.now() - entry.timestamp;
  }
}

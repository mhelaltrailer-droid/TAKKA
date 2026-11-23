/**
 * Tiny process-local TTL map. No Redis / no persistence — fine for Render
 * single-instance free tier. Values are cloned on get so callers cannot
 * mutate the cached object.
 */

export type TtlCacheStats = {
  size: number;
  hits: number;
  misses: number;
};

export class TtlCache<T> {
  private readonly store = new Map<
    string,
    { value: T; expiresAt: number }
  >();
  private hits = 0;
  private misses = 0;

  constructor(private readonly maxEntries = 200) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.misses += 1;
      return undefined;
    }
    this.hits += 1;
    return structuredClone(entry.value);
  }

  set(key: string, value: T, ttlMs: number): void {
    if (ttlMs <= 0) {
      return;
    }
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      // Drop the oldest inserted key (Map insertion order).
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) {
        this.store.delete(oldest);
      }
    }
    this.store.set(key, {
      value: structuredClone(value),
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }

  stats(): TtlCacheStats {
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
    };
  }

  /** Test helper: force-expire every entry. */
  expireAll(): void {
    for (const entry of this.store.values()) {
      entry.expiresAt = 0;
    }
  }
}

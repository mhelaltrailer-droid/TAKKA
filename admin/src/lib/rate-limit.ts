export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export type RateLimiter = {
  check(key: string, now?: number): RateLimitDecision;
  reset(): void;
};

/**
 * Sliding-window limiter kept in process memory.
 * Enough for the single Render web instance; a restart clears the buckets.
 */
export function createMemoryRateLimiter(options: {
  limit: number;
  windowMs: number;
}): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    check(key, now = Date.now()) {
      const bucketKey = key.trim().slice(0, 80) || "unknown";
      const windowStart = now - options.windowMs;
      const recent = (hits.get(bucketKey) ?? []).filter(
        (timestamp) => timestamp > windowStart,
      );

      if (recent.length >= options.limit) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((recent[0] + options.windowMs - now) / 1000),
        );
        hits.set(bucketKey, recent);
        return { allowed: false, retryAfterSeconds };
      }

      recent.push(now);
      hits.set(bucketKey, recent);
      return { allowed: true };
    },
    reset() {
      hits.clear();
    },
  };
}

/** 6 posts / 10 minutes from one IP. */
export const joinKitchenIpLimiter = createMemoryRateLimiter({
  limit: 6,
  windowMs: 10 * 60 * 1000,
});

/** 3 posts / hour for the same WhatsApp number. */
export const joinKitchenPhoneLimiter = createMemoryRateLimiter({
  limit: 3,
  windowMs: 60 * 60 * 1000,
});

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  return "unknown";
}

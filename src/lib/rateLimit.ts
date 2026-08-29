// Minimal in-memory rate limiter (Phase 10 hardening) for the login endpoint.
// Good enough for a single-instance deployment (Render free tier runs one
// instance) — if this app ever runs multiple instances, this would need to
// move to a shared store (e.g. a Postgres table or Redis) since each
// instance would otherwise track its own counters.

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

// Cap the map size defensively — a flood of distinct keys (e.g. many emails
// from the same attacker) shouldn't be able to grow this unboundedly.
const MAX_TRACKED_KEYS = 5000;

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Sliding-window-ish limiter: allows `limit` attempts per `windowMs` for a
 * given key, then blocks until the window resets. Call `recordFailure` only
 * on a *failed* attempt — a correct password should never count against the
 * limit, so a legitimate user who mistypes a few times still gets through
 * once they get it right.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > windowMs) {
    return { allowed: true };
  }
  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.ceil((bucket.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
  }
  return { allowed: true };
}

export function recordFailure(key: string, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > windowMs) {
    if (buckets.size >= MAX_TRACKED_KEYS) buckets.clear();
    buckets.set(key, { count: 1, windowStart: now });
    return;
  }
  bucket.count += 1;
}

export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

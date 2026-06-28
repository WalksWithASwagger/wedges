import { createHash } from "node:crypto";

/**
 * Token-bucket rate limiter, ported (framework-free) from
 * bothhandsfull `src/lib/rate-limit.ts`. Caveat: the store is in-memory, so on
 * serverless it is per-instance — on Fluid Compute it persists across requests
 * on a warm instance but resets on cold start and isn't shared fleet-wide. It's
 * a v1 guardrail on the LLM tools; a durable upgrade (KV-backed limiter or a
 * Vercel Firewall rate-limit rule on /api/mcp) can layer on later.
 */
export interface Bucket {
  tokens: number;
  updatedAt: number;
}

export interface RateLimitConfig {
  capacity: number;
  refillPerSecond: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

class MemoryStore {
  private readonly map = new Map<string, Bucket>();
  get(key: string): Bucket | undefined {
    return this.map.get(key);
  }
  set(key: string, bucket: Bucket): void {
    this.map.set(key, bucket);
  }
}

class RateLimiter {
  private readonly store = new MemoryStore();

  consume(key: string, config: RateLimitConfig, cost = 1): RateLimitResult {
    const now = Date.now();
    const existing = this.store.get(key);
    const tokens = existing
      ? Math.min(
          config.capacity,
          existing.tokens + ((now - existing.updatedAt) / 1000) * config.refillPerSecond,
        )
      : config.capacity;

    if (tokens < cost) {
      const retryAfterSeconds = Math.max(1, Math.ceil((cost - tokens) / config.refillPerSecond));
      this.store.set(key, { tokens, updatedAt: now });
      return { allowed: false, remaining: Math.floor(tokens), retryAfterSeconds };
    }

    const remaining = tokens - cost;
    this.store.set(key, { tokens: remaining, updatedAt: now });
    return { allowed: true, remaining: Math.floor(remaining), retryAfterSeconds: 0 };
  }
}

export const ENV_KEY_LIMIT: RateLimitConfig = { capacity: 10, refillPerSecond: 10 / 60 };
export const BYO_KEY_LIMIT: RateLimitConfig = { capacity: 60, refillPerSecond: 60 / 60 };

const sharedLimiter = new RateLimiter();

type IsoHeaders = Record<string, string | string[] | undefined> | undefined;

function headerValue(headers: IsoHeaders, name: string): string | undefined {
  const raw = headers?.[name];
  if (Array.isArray(raw)) return raw[0]?.trim();
  return raw?.trim();
}

function clientIp(headers: IsoHeaders): string {
  const xff = headerValue(headers, "x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return headerValue(headers, "x-real-ip") || "unknown";
}

function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

/**
 * Rate-limit one LLM tool call. BYO-key callers get their own (higher) bucket
 * keyed by the hashed key; everyone else is bucketed by client IP.
 */
export function checkRateLimit(
  route: string,
  headers: IsoHeaders,
  byoKey?: string,
): RateLimitResult {
  if (byoKey?.trim()) {
    return sharedLimiter.consume(`${route}:byo:${hashKey(byoKey.trim())}`, BYO_KEY_LIMIT);
  }
  return sharedLimiter.consume(`${route}:env:${clientIp(headers)}`, ENV_KEY_LIMIT);
}

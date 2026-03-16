/**
 * In-memory rate limiter — fixed window counter per key.
 * Suitable for single-instance Node.js runtime (not Edge/serverless).
 */
import type { NextRequest } from "next/server";

type Window = { count: number; resetAt: number };

const store = new Map<string, Window>();

/** Purge expired entries every 5 minutes to prevent unbounded memory growth. */
const CLEANUP_INTERVAL_MS = 5 * 60_000;
let lastCleanup = Date.now();

function purgeExpired(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [k, v] of store) {
    if (now >= v.resetAt) store.delete(k);
  }
}

export function checkRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  purgeExpired(now);

  const win = store.get(key);

  if (!win || now >= win.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  win.count += 1;
  return {
    allowed: win.count <= limit,
    remaining: Math.max(0, limit - win.count),
    resetAt: win.resetAt,
  };
}

/**
 * Extract client IP for rate-limiting.
 *
 * SECURITY: x-forwarded-for / x-real-ip are trivially spoofable by clients.
 * Only trust them when running behind a reverse proxy that overwrites
 * the header (set TRUSTED_PROXY=true in that case).
 * Otherwise fall back to a fixed key so rate-limiting still works globally.
 */
export function getClientIp(req: NextRequest): string {
  if (process.env.TRUSTED_PROXY === "true") {
    return (
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "anonymous"
    );
  }
  // Direct exposure — use request IP from Next.js if available, else fallback to global
  const ip = req.headers.get("x-real-ip");
  if (ip) return ip;
  console.warn("[rate-limiter] No client IP available, using global key — all users share one bucket");
  return "global";
}

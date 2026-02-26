/**
 * In-memory rate limiter — fixed window counter per key.
 * Suitable for single-instance Node.js runtime (not Edge/serverless).
 */
import type { NextRequest } from "next/server";

type Window = { count: number; resetAt: number };

const store = new Map<string, Window>();

export function checkRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
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

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous"
  );
}

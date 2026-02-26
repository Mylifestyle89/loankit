/**
 * API route helpers — Zod body validation, error handling, and rate limiting.
 */
import { NextRequest, NextResponse } from "next/server";
import type { ZodType } from "zod";

import { toHttpError } from "@/core/errors/app-error";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

type NextHandler = (req: NextRequest) => Promise<NextResponse>;
type BodyHandler<T> = (body: T, req: NextRequest) => Promise<NextResponse>;

/**
 * Wraps a route handler with Zod body validation.
 * Returns 400 with field-level errors if the JSON body is missing or invalid.
 */
export function withValidatedBody<T>(
  schema: ZodType<T>,
  handler: BodyHandler<T>,
): NextHandler {
  return async (req: NextRequest) => {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }
    const result = schema.safeParse(raw);
    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: "Validation failed.", details: result.error.flatten((i) => i.message).fieldErrors },
        { status: 400 },
      );
    }
    return handler(result.data, req);
  };
}

/**
 * Wraps a route handler with try/catch using toHttpError for standardised error responses.
 * Compose with withValidatedBody:
 *   export const PUT = withErrorHandling(withValidatedBody(schema, handler), "fallback message");
 */
export function withErrorHandling(handler: NextHandler, fallbackMessage = "Internal server error."): NextHandler {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      const httpError = toHttpError(error, fallbackMessage);
      return NextResponse.json(
        { ok: false, error: httpError.message, details: httpError.details },
        { status: httpError.status },
      );
    }
  };
}

/**
 * Wraps a route handler with in-memory rate limiting (fixed window, per IP + routeKey).
 * Returns 429 with Retry-After header when the limit is exceeded.
 * Usage: export const POST = withRateLimit("suggest")(withErrorHandling(...));
 */
export function withRateLimit(routeKey: string, maxPerMinute = 60) {
  return (handler: NextHandler): NextHandler =>
    async (req: NextRequest) => {
      const ip = getClientIp(req);
      const result = checkRateLimit(`${routeKey}:${ip}`, maxPerMinute);
      if (!result.allowed) {
        return NextResponse.json(
          { ok: false, error: "Rate limit exceeded. Please try again later." },
          {
            status: 429,
            headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) },
          },
        );
      }
      return handler(req);
    };
}

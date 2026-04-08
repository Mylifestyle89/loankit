import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AppError } from "@/core/errors/app-error";
import { applySecurityHeaders } from "@/lib/api-helpers";
import { AuthError } from "@/lib/auth-guard";

type RouteHandler = (
  req: NextRequest,
  ctx?: { params: Promise<Record<string, string>> },
) => Promise<NextResponse>;

/**
 * Wraps a Next.js route handler with consistent error handling + security headers.
 * Maps known error types to appropriate HTTP status codes.
 */
export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return applySecurityHeaders(await handler(req, ctx));
    } catch (error) {
      // Zod validation errors → 400
      if (error instanceof z.ZodError) {
        return applySecurityHeaders(
          NextResponse.json(
            { ok: false, error: "Invalid request body", details: error.flatten().fieldErrors },
            { status: 400 },
          ),
        );
      }
      // Auth errors → 401/403
      if (error instanceof AuthError) {
        return applySecurityHeaders(
          NextResponse.json({ ok: false, error: error.message }, { status: error.status }),
        );
      }
      // App errors (NotFound, Validation, etc.) → mapped status
      if (error instanceof AppError) {
        return applySecurityHeaders(
          NextResponse.json(
            { ok: false, error: error.message, details: error.details },
            { status: error.status },
          ),
        );
      }
      // Unknown errors → 500 (don't expose internals)
      console.error("[API Error]", error);
      return applySecurityHeaders(
        NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 }),
      );
    }
  };
}

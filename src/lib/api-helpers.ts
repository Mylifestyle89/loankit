import { NextResponse, type NextRequest, type NextResponse as NextResponseType } from "next/server";
import { type ZodType } from "zod";

/**
 * Security headers để áp dụng cho tất cả API responses
 */
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
} as const;

/**
 * Apply security headers vào NextResponse
 */
export function applySecurityHeaders(response: NextResponseType): NextResponseType {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Validate request body với Zod schema
 * Usage: withValidatedBody(schema, async (validatedBody) => { return NextResponse.json(...) })
 * Returns a function that accepts NextRequest
 */
export function withValidatedBody<T extends ZodType>(
  schema: T,
  handler: (data: T["_output"]) => Promise<NextResponseType>
) {
  return async (req: NextRequest): Promise<NextResponseType> => {
    try {
      const body = await req.json();
      const validated = schema.parse(body);
      return applySecurityHeaders(await handler(validated));
    } catch (error) {
      const response = NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Invalid request body",
        },
        { status: 400 }
      );
      return applySecurityHeaders(response);
    }
  };
}

/**
 * Wrap route handler với error handling và security headers
 * Usage: withErrorHandling(async (req) => { return NextResponse.json(...) }, "error message")
 */
export function withErrorHandling(
  handler: (req: NextRequest) => Promise<NextResponseType>,
  errorMessage?: string
) {
  return async (req: NextRequest): Promise<NextResponseType> => {
    try {
      return applySecurityHeaders(await handler(req));
    } catch (error) {
      const response = NextResponse.json(
        {
          error: errorMessage || (error instanceof Error ? error.message : "Internal server error"),
        },
        { status: 500 }
      );
      return applySecurityHeaders(response);
    }
  };
}

/**
 * In-memory rate limiter state (per route key)
 * In production, consider using Redis or external service
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute per key
};

/**
 * Rate limiting middleware for API routes
 * Usage: export const POST = withRateLimit("route-key")(async (req) => { ... })
 */
export function withRateLimit(key: string) {
  return (
    handler: (req: NextRequest) => Promise<NextResponseType>
  ): ((req: NextRequest) => Promise<NextResponseType>) => {
    return async (req: NextRequest) => {
      const now = Date.now();
      const rateLimitEntry = rateLimitStore.get(key);

      // Initialize or reset if window expired
      if (!rateLimitEntry || now >= rateLimitEntry.resetTime) {
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + RATE_LIMIT_CONFIG.windowMs,
        });
        return applySecurityHeaders(await handler(req));
      }

      // Check if limit exceeded
      if (rateLimitEntry.count >= RATE_LIMIT_CONFIG.maxRequests) {
        const response = NextResponse.json(
          {
            error: "Rate limit exceeded",
            retryAfter: Math.ceil(
              (rateLimitEntry.resetTime - now) / 1000
            ),
          },
          { status: 429 }
        );
        response.headers.set(
          "Retry-After",
          String(Math.ceil((rateLimitEntry.resetTime - now) / 1000))
        );
        return applySecurityHeaders(response);
      }

      // Increment counter
      rateLimitEntry.count++;
      return applySecurityHeaders(await handler(req));
    };
  };
}

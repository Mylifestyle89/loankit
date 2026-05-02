import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { runDeadlineCheck } from "@/lib/notifications/deadline-check-logic";

export const runtime = "nodejs";

/** Timing-safe string comparison to prevent timing attacks */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(req: NextRequest) {
  console.log(`[cron/invoice-deadlines] Called at ${new Date().toISOString()} ua=${req.headers.get("user-agent") ?? "unknown"}`);

  // Validate cron secret — supports Vercel Cron (Authorization: Bearer) or custom header (x-cron-secret).
  // Do NOT accept ?secret= query param: secrets in query strings appear in server access logs, CDN logs, and browser history.
  const expected = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  const custom = req.headers.get("x-cron-secret");
  const secret = bearer || custom; // removed query fallback — must use header
  if (!expected) {
    console.error("[cron/invoice-deadlines] CRON_SECRET env var not set");
    return NextResponse.json({ ok: false, error: "Server misconfigured" }, { status: 500 });
  }
  if (!secret || !safeCompare(secret, expected)) {
    console.warn(`[cron/invoice-deadlines] Unauthorized: bearer=${!!bearer} custom=${!!custom}`);
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runDeadlineCheck();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("[cron/invoice-deadlines] Error:", error);
    const httpError = toHttpError(error, "Internal server error.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { runDeadlineCheck } from "@/lib/notifications/deadline-check-logic";

export const runtime = "nodejs";

/** Timing-safe string comparison to prevent timing attacks */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(req: NextRequest) {
  console.log(`[cron/invoice-deadlines] Called at ${new Date().toISOString()} ua=${req.headers.get("user-agent") ?? "unknown"}`);

  // Validate cron secret — supports Vercel Cron (Authorization: Bearer), custom header (x-cron-secret), or query ?secret=
  const expected = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  const custom = req.headers.get("x-cron-secret");
  const query = req.nextUrl.searchParams.get("secret");
  const secret = bearer || custom || query;
  if (!expected) {
    console.error("[cron/invoice-deadlines] CRON_SECRET env var not set");
    return NextResponse.json({ ok: false, error: "Server misconfigured" }, { status: 500 });
  }
  if (!secret || !safeCompare(secret, expected)) {
    console.warn(`[cron/invoice-deadlines] Unauthorized: bearer=${!!bearer} custom=${!!custom} query=${!!query}`);
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runDeadlineCheck();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("[cron/invoice-deadlines] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

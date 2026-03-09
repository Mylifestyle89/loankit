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
  // Validate cron secret with timing-safe comparison
  const secret = req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || !secret || !safeCompare(secret, expected)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runDeadlineCheck();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("[cron/invoice-deadlines] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

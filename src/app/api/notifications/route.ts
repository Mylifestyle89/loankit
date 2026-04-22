import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import { notificationService } from "@/services/notification.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const params = req.nextUrl.searchParams;
    const unreadOnly = params.get("unreadOnly") === "true";
    const limit = Math.min(Number(params.get("limit") ?? 50), 100);
    const skip = Number(params.get("skip") ?? 0);
    const [notifications, unreadCount, total] = await Promise.all([
      notificationService.list({ unreadOnly, limit, skip }),
      notificationService.getUnreadCount(),
      notificationService.countAll({ unreadOnly }),
    ]);
    return NextResponse.json({ ok: true, notifications, unreadCount, total });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to list notifications.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

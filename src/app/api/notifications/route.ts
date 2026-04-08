import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import { notificationService } from "@/services/notification.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true";
    const [notifications, unreadCount] = await Promise.all([
      notificationService.list({ unreadOnly }),
      notificationService.getUnreadCount(),
    ]);
    return NextResponse.json({ ok: true, notifications, unreadCount });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to list notifications.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

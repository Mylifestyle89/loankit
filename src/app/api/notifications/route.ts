import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { notificationService } from "@/services/notification.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true";
    const [notifications, unreadCount] = await Promise.all([
      notificationService.list({ unreadOnly }),
      notificationService.getUnreadCount(),
    ]);
    return NextResponse.json({ ok: true, notifications, unreadCount });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to list notifications.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

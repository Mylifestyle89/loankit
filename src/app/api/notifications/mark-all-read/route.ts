import { NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { notificationService } from "@/services/notification.service";

export const runtime = "nodejs";

export async function POST() {
  try {
    await notificationService.markAllRead();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to mark all notifications as read.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

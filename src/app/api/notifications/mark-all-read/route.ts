import { NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import { notificationService } from "@/services/notification.service";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await requireSession();
    const isAdmin = session.user.role === "admin";
    await notificationService.markAllRead({ userId: session.user.id, isAdmin });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to mark all notifications as read.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

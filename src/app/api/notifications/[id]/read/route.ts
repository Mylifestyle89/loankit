import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import { notificationService } from "@/services/notification.service";

export const runtime = "nodejs";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await params;
    const notification = await notificationService.markRead(id);
    return NextResponse.json({ ok: true, notification });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to mark notification as read.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

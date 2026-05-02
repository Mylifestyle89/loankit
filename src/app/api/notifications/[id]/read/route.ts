import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import { customerService } from "@/services/customer.service";
import { notificationService } from "@/services/notification.service";

export const runtime = "nodejs";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const existing = await notificationService.getById(id);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    // IDOR check: non-admin users may only mark notifications they can access
    if (session.user.role !== "admin" && existing.customerId) {
      const hasAccess = await customerService.checkCustomerAccess(existing.customerId, session.user.id);
      if (!hasAccess) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
    }
    const notification = await notificationService.markRead(id);
    return NextResponse.json({ ok: true, notification });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to mark notification as read.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

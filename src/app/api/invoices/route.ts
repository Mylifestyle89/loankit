import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import { invoiceService } from "@/services/invoice.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const isAdmin = session.user.role === "admin";
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const invoices = await invoiceService.listAll({ status, customerId, userId: session.user.id, isAdmin });
    return NextResponse.json({ ok: true, invoices });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to list invoices.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

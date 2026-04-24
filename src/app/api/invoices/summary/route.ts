import { NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import { invoiceService } from "@/services/invoice.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireSession();
    const summary = await invoiceService.getCustomerSummary();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to get invoice summary.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

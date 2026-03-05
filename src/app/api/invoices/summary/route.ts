import { NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { invoiceService } from "@/services/invoice.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const summary = await invoiceService.getCustomerSummary();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to get invoice summary.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

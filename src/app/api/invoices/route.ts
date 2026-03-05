import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { invoiceService } from "@/services/invoice.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const invoices = await invoiceService.listAll({ status, customerId });
    return NextResponse.json({ ok: true, invoices });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to list invoices.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

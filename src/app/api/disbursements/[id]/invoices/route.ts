import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { invoiceService } from "@/services/invoice.service";

export const runtime = "nodejs";

const createSchema = z.object({
  invoiceNumber: z.string().min(1),
  supplierName: z.string().min(1),
  amount: z.number().positive(),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  customDeadline: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: disbursementId } = await params;
    const invoices = await invoiceService.listByDisbursement(disbursementId);
    return NextResponse.json({ ok: true, invoices });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to list invoices.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: disbursementId } = await params;
    const body = await req.json();
    const parsed = createSchema.parse(body);
    const { invoice, duplicateWarning } = await invoiceService.create({
      ...parsed,
      disbursementId,
    });
    return NextResponse.json({ ok: true, invoice, duplicateWarning });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const ve = new ValidationError("Invalid request body.", error.flatten().fieldErrors);
      return NextResponse.json({ ok: false, error: ve.message, details: ve.details }, { status: ve.status });
    }
    const httpError = toHttpError(error, "Failed to create invoice.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

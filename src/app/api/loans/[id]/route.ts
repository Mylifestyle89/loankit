import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { TRACKING_STATUSES } from "@/lib/invoice-tracking-format-helpers";
import { loanService } from "@/services/loan.service";

export const runtime = "nodejs";

const updateSchema = z.object({
  contractNumber: z.string().min(1).optional(),
  loanAmount: z.number().positive().optional(),
  interestRate: z.number().optional().nullable(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  purpose: z.string().optional().nullable(),
  disbursementCount: z.string().optional().nullable(),
  collateralValue: z.number().optional().nullable(),
  securedObligation: z.number().optional().nullable(),
  disbursementLimitByAsset: z.number().optional().nullable(),
  status: z.enum(TRACKING_STATUSES).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const loan = await loanService.getById(id);
    return NextResponse.json({ ok: true, loan });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to get loan.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.parse(body);
    const loan = await loanService.update(id, parsed);
    return NextResponse.json({ ok: true, loan });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const ve = new ValidationError("Invalid request body.", error.flatten().fieldErrors);
      return NextResponse.json({ ok: false, error: ve.message, details: ve.details }, { status: ve.status });
    }
    const httpError = toHttpError(error, "Failed to update loan.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await loanService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to delete loan.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

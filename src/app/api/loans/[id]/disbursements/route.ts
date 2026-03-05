import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { disbursementService } from "@/services/disbursement.service";

export const runtime = "nodejs";

const createSchema = z.object({
  amount: z.number().positive(),
  disbursementDate: z.string().min(1),
  description: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: loanId } = await params;
    const sp = req.nextUrl.searchParams;
    const page = sp.get("page") ? Number(sp.get("page")) : undefined;
    const pageSize = sp.get("pageSize") ? Number(sp.get("pageSize")) : undefined;
    const status = sp.get("status") || undefined;
    const search = sp.get("search") || undefined;
    const dateFrom = sp.get("dateFrom") || undefined;
    const dateTo = sp.get("dateTo") || undefined;

    const [result, summary] = await Promise.all([
      disbursementService.listByLoan(loanId, { page, pageSize, status, search, dateFrom, dateTo }),
      disbursementService.getSummaryByLoan(loanId),
    ]);

    return NextResponse.json({ ok: true, ...result, summary });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to list disbursements.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: loanId } = await params;
    const body = await req.json();
    const parsed = createSchema.parse(body);
    const disbursement = await disbursementService.create({ ...parsed, loanId });
    return NextResponse.json({ ok: true, disbursement });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const ve = new ValidationError("Invalid request body.", error.flatten().fieldErrors);
      return NextResponse.json({ ok: false, error: ve.message, details: ve.details }, { status: ve.status });
    }
    const httpError = toHttpError(error, "Failed to create disbursement.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

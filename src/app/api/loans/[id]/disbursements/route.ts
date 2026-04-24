import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { requireSession, requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { disbursementService } from "@/services/disbursement.service";

export const runtime = "nodejs";

const invoiceLineSchema = z.object({
  supplierName: z.string().min(1),
  invoiceNumber: z.string().min(1),
  issueDate: z.string().min(1),
  amount: z.number().positive(),
  qty: z.number().optional(),
  unitPrice: z.number().optional(),
});

const beneficiaryLineSchema = z.object({
  beneficiaryId: z.string().nullish(),
  beneficiaryName: z.string().min(1),
  address: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  amount: z.number().positive(),
  invoiceStatus: z.enum(["pending", "has_invoice", "bang_ke"]).optional(),
  invoices: z.array(invoiceLineSchema).optional(),
});

const createSchema = z.object({
  amount: z.number().positive(),
  disbursementDate: z.string().min(1),
  description: z.string().optional(),
  currentOutstanding: z.number().optional(),
  debtAmount: z.number().optional(),
  totalOutstanding: z.number().optional(),
  purpose: z.string().optional(),
  supportingDoc: z.string().optional(),
  loanTerm: z.number().int().optional(),
  termUnit: z.enum(["tháng", "ngày"]).optional(),
  repaymentEndDate: z.string().optional(),
  principalSchedule: z.string().optional(),
  interestSchedule: z.string().optional(),
  beneficiaries: z.array(beneficiaryLineSchema).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
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
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to list disbursements.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireEditorOrAdmin();
    const { id: loanId } = await params;
    const body = await req.json();
    const parsed = createSchema.parse(body);
    const disbursement = await disbursementService.create({ ...parsed, loanId });
    return NextResponse.json({ ok: true, disbursement });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    if (error instanceof z.ZodError) {
      const ve = new ValidationError("Invalid request body.", error.flatten().fieldErrors);
      return NextResponse.json({ ok: false, error: ve.message, details: ve.details }, { status: ve.status });
    }
    const httpError = toHttpError(error, "Failed to create disbursement.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

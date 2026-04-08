import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { requireSession, requireEditorOrAdmin, requireAdmin, handleAuthError } from "@/lib/auth-guard";
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
  lending_method: z.string().optional().nullable(),
  tcmblm_reason: z.string().optional().nullable(),
  interest_method: z.string().optional().nullable(),
  principal_schedule: z.string().optional().nullable(),
  interest_schedule: z.string().optional().nullable(),
  policy_program: z.string().optional().nullable(),
  total_capital_need: z.number().optional().nullable(),
  equity_amount: z.number().optional().nullable(),
  cash_equity: z.number().optional().nullable(),
  labor_equity: z.number().optional().nullable(),
  other_loan: z.number().optional().nullable(),
  other_asset_equity: z.number().optional().nullable(),
  expected_revenue: z.number().optional().nullable(),
  expected_cost: z.number().optional().nullable(),
  expected_profit: z.number().optional().nullable(),
  from_project: z.string().optional().nullable(),
  other_income: z.string().optional().nullable(),
  other_income_detail: z.string().optional().nullable(),
  customer_rating: z.string().optional().nullable(),
  debt_group: z.string().optional().nullable(),
  scoring_period: z.string().optional().nullable(),
  prior_contract_number: z.string().optional().nullable(),
  prior_contract_date: z.string().optional().nullable(),
  prior_outstanding: z.number().optional().nullable(),
  selectedCollateralIds: z.string().refine(
    (v) => { try { const a = JSON.parse(v); return Array.isArray(a) && a.every((i: unknown) => typeof i === "string"); } catch { return false; } },
    { message: "Must be a JSON array of strings" },
  ).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await params;
    const loan = await loanService.getById(id);
    return NextResponse.json({ ok: true, loan });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to get loan.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireEditorOrAdmin();
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
    await requireAdmin();
    const { id } = await params;
    await loanService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to delete loan.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

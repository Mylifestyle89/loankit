import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { loanService } from "@/services/loan.service";
import { requireSession, requireAdmin, handleAuthError } from "@/lib/auth-guard";

export const runtime = "nodejs";

const createSchema = z.object({
  customerId: z.string().min(1),
  contractNumber: z.string().min(1),
  loanAmount: z.number().positive(),
  interestRate: z.number().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  purpose: z.string().optional(),
  disbursementCount: z.string().optional(),
  // Optional extended fields for DOCX import / loan plan builder
  loan_method: z.string().nullable().optional(),
  lending_method: z.string().nullable().optional(),
  principal_schedule: z.string().nullable().optional(),
  interest_schedule: z.string().nullable().optional(),
  total_capital_need: z.number().nullable().optional(),
  equity_amount: z.number().nullable().optional(),
  expected_revenue: z.number().nullable().optional(),
  expected_profit: z.number().nullable().optional(),
  loanPlanId: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const isAdmin = session.user.role === "admin";
    const sp = req.nextUrl.searchParams;
    const customerId = sp.get("customerId") ?? undefined;
    const search = sp.get("search") ?? undefined;
    const status = sp.get("status") ?? undefined;
    const customerType = sp.get("customerType") ?? undefined;
    const sortBy = sp.get("sortBy") ?? undefined;
    const rawOrder = sp.get("sortOrder");
    const sortOrder = rawOrder === "asc" || rawOrder === "desc" ? rawOrder : undefined;
    const page = Number(sp.get("page")) || 1;
    const limit = Number(sp.get("limit")) || 50;
    const result = await loanService.list({ customerId, search, status, customerType, sortBy, sortOrder, page, limit, userId: session.user.id, isAdmin });
    return NextResponse.json({ ok: true, loans: result.data, total: result.total, page: result.page, limit: result.limit });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to list loans.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = createSchema.parse(body);
    const loan = await loanService.create(parsed);
    return NextResponse.json({ ok: true, loan });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const ve = new ValidationError("Invalid request body.", error.flatten().fieldErrors);
      return NextResponse.json({ ok: false, error: ve.message, details: ve.details }, { status: ve.status });
    }
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to create loan.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { requireSession, requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { customerService } from "@/services/customer.service";
import { beneficiaryService } from "@/services/beneficiary.service";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(1),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (session.user.role !== "admin") {
      const ok = await customerService.checkLoanAccess(id, session.user.id);
      if (!ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const beneficiaries = await beneficiaryService.listByLoan(id);
    return NextResponse.json({ ok: true, beneficiaries });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to list beneficiaries.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireEditorOrAdmin();
    const { id } = await params;
    const body = await req.json();
    const parsed = createSchema.parse(body);
    const beneficiary = await beneficiaryService.create({ loanId: id, ...parsed });
    return NextResponse.json({ ok: true, beneficiary }, { status: 201 });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    if (error instanceof z.ZodError) {
      const ve = new ValidationError("Invalid request body.", error.flatten().fieldErrors);
      return NextResponse.json({ ok: false, error: ve.message, details: ve.details }, { status: ve.status });
    }
    const httpError = toHttpError(error, "Failed to create beneficiary.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

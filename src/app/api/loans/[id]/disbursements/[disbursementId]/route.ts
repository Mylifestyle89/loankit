import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { disbursementService } from "@/services/disbursement.service";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string; disbursementId: string }> };

const invoiceLineSchema = z.object({
  supplierName: z.string().min(1),
  invoiceNumber: z.string().min(1),
  issueDate: z.string().min(1),
  amount: z.number().positive(),
  qty: z.number().optional(),
  unitPrice: z.number().optional(),
  itemsJson: z.string().optional(),
  templateType: z.string().optional(),
});

const beneficiaryLineSchema = z.object({
  beneficiaryId: z.string().nullish(),
  beneficiaryName: z.string().min(1),
  address: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  amount: z.number().positive(),
  invoiceStatus: z.enum(["pending", "has_invoice", "bang_ke", "hoa_don_vat"]).optional(),
  invoices: z.array(invoiceLineSchema).optional(),
});

const updateSchema = z.object({
  amount: z.number().positive(),
  disbursementDate: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.enum(["active", "completed", "cancelled"]).optional(),
  currentOutstanding: z.number().optional(),
  debtAmount: z.number().optional(),
  totalOutstanding: z.number().optional(),
  purpose: z.string().optional(),
  supportingDoc: z.string().optional(),
  loanTerm: z.number().int().optional(),
  repaymentEndDate: z.string().optional(),
  principalSchedule: z.string().optional(),
  interestSchedule: z.string().optional(),
  beneficiaries: z.array(beneficiaryLineSchema).optional(),
});

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireSession();
    const { disbursementId } = await params;
    const disbursement = await disbursementService.getById(disbursementId);
    return NextResponse.json({ ok: true, disbursement });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to fetch disbursement.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireEditorOrAdmin();
    const { disbursementId } = await params;
    const body = await req.json();
    const parsed = updateSchema.parse(body);
    const updated = await disbursementService.fullUpdate(disbursementId, parsed);
    return NextResponse.json({ ok: true, disbursement: updated });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to update disbursement.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

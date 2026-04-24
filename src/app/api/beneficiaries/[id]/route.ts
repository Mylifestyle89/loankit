import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { beneficiaryService } from "@/services/beneficiary.service";

export const runtime = "nodejs";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  accountNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireEditorOrAdmin();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.parse(body);
    const beneficiary = await beneficiaryService.update(id, parsed);
    return NextResponse.json({ ok: true, beneficiary });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    if (error instanceof z.ZodError) {
      const ve = new ValidationError("Invalid request body.", error.flatten().fieldErrors);
      return NextResponse.json({ ok: false, error: ve.message, details: ve.details }, { status: ve.status });
    }
    const httpError = toHttpError(error, "Failed to update beneficiary.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireEditorOrAdmin();
    const { id } = await params;
    await beneficiaryService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to delete beneficiary.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

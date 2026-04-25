import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { requireSession, requireEditorOrAdmin, requireAdmin, handleAuthError } from "@/lib/auth-guard";
import { customerService } from "@/services/customer.service";
import { TRACKING_STATUSES } from "@/lib/invoice-tracking-format-helpers";
import { disbursementService } from "@/services/disbursement.service";

export const runtime = "nodejs";

const updateSchema = z.object({
  amount: z.number().positive().optional(),
  disbursementDate: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(TRACKING_STATUSES).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (session.user.role !== "admin") {
      const ok = await customerService.checkDisbursementAccess(id, session.user.id);
      if (!ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const [disbursement, surplusDeficit] = await Promise.all([
      disbursementService.getById(id),
      disbursementService.getSurplusDeficit(id),
    ]);
    return NextResponse.json({ ok: true, disbursement, surplusDeficit });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to get disbursement.");
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
    const disbursement = await disbursementService.update(id, parsed);
    return NextResponse.json({ ok: true, disbursement });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    if (error instanceof z.ZodError) {
      const ve = new ValidationError("Invalid request body.", error.flatten().fieldErrors);
      return NextResponse.json({ ok: false, error: ve.message, details: ve.details }, { status: ve.status });
    }
    const httpError = toHttpError(error, "Failed to update disbursement.");
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
    await disbursementService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to delete disbursement.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

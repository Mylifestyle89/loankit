import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { requireSession, requireEditorOrAdmin, requireAdmin, handleAuthError } from "@/lib/auth-guard";
import { customerService } from "@/services/customer.service";
import { invoiceService } from "@/services/invoice.service";

export const runtime = "nodejs";

const updateSchema = z.object({
  invoiceNumber: z.string().min(1).optional(),
  supplierName: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  issueDate: z.string().min(1).optional(),
  dueDate: z.string().min(1).optional(),
  customDeadline: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["pending", "overdue"]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (session.user.role !== "admin") {
      const ok = await customerService.checkInvoiceAccess(id, session.user.id);
      if (!ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const invoice = await invoiceService.getById(id);
    return NextResponse.json({ ok: true, invoice });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to get invoice.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireEditorOrAdmin();
    const { id } = await params;
    if (session.user.role !== "admin") {
      const ok = await customerService.checkInvoiceAccess(id, session.user.id);
      if (!ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const parsed = updateSchema.parse(body);
    const invoice = await invoiceService.update(id, parsed);
    return NextResponse.json({ ok: true, invoice });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    if (error instanceof z.ZodError) {
      const ve = new ValidationError("Invalid request body.", error.flatten().fieldErrors);
      return NextResponse.json({ ok: false, error: ve.message, details: ve.details }, { status: ve.status });
    }
    const httpError = toHttpError(error, "Failed to update invoice.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    if (session.user.role !== "admin") {
      const ok = await customerService.checkInvoiceAccess(id, session.user.id);
      if (!ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    await invoiceService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to delete invoice.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

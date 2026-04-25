import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { checkDisbursementAccess } from "@/services/customer-access.service";
import { generateRetailInvoiceDoc } from "@/services/retail-invoice-report.service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** GET /api/disbursements/[id]/retail-doc — return templateType of the stored retail invoice (if any) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id: disbursementId } = await params;
    if (session.user.role !== "admin") {
      const ok = await checkDisbursementAccess(disbursementId, session.user.id);
      if (!ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const invoice = await prisma.invoice.findFirst({
      where: {
        disbursementId,
        OR: [
          { items_json: { not: null } },
          { templateType: { not: null } },
        ],
      },
      select: { templateType: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ok: true, templateType: invoice?.templateType ?? null });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ ok: false, error: toHttpError(error, "Failed").message }, { status: 500 });
  }
}

const bodySchema = z.object({
  templateType: z.enum(["tap_hoa", "vlxd", "y_te", "nong_san"]),
});

/**
 * POST /api/disbursements/[id]/retail-doc
 * Finds the most recent retail invoice (items_json) for this disbursement
 * and generates a DOCX download. Used by KhcnDisbursementReportModal.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireEditorOrAdmin();
    const { id: disbursementId } = await params;

    if (session.user.role !== "admin") {
      const ok = await checkDisbursementAccess(disbursementId, session.user.id);
      if (!ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { templateType } = bodySchema.parse(await req.json());

    // Find most recent invoice of this disbursement that has retail items
    const invoice = await prisma.invoice.findFirst({
      where: { disbursementId, items_json: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { ok: false, error: "Chưa có hóa đơn bán lẻ — vui lòng tạo từ mục Hóa đơn trước." },
        { status: 404 },
      );
    }

    const { buffer, filename } = await generateRetailInvoiceDoc(invoice.id, templateType);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid templateType" }, { status: 400 });
    }
    const httpError = toHttpError(error, "Failed to generate retail invoice.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

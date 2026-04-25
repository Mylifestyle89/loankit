import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { checkInvoiceAccess } from "@/services/customer-access.service";
import { generateRetailInvoiceDoc } from "@/services/retail-invoice-report.service";

export const runtime = "nodejs";

const bodySchema = z.object({
  templateType: z.enum(["tap_hoa", "vlxd", "y_te", "nong_san"]),
});

/** POST /api/invoices/[id]/retail-doc — generate retail invoice DOCX for download */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireEditorOrAdmin();
    const { id } = await params;

    if (session.user.role !== "admin") {
      const ok = await checkInvoiceAccess(id, session.user.id);
      if (!ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { templateType } = bodySchema.parse(await req.json());
    const { buffer, filename } = await generateRetailInvoiceDoc(id, templateType);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
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

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { generateReport, DISBURSEMENT_TEMPLATES } from "@/services/disbursement-report.service";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string; disbursementId: string }> };

const bodySchema = z.object({
  templateKey: z.enum(["bcdx", "giay_nhan_no", "danh_muc_ho_so", "in_unc", "cam_ket_bo_sung_chung_tu"]),
  overrides: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await requireEditorOrAdmin();
    const { disbursementId } = await params;
    const body = await req.json();
    const { templateKey, overrides } = bodySchema.parse(body);

    const { buffer, filename, contentType } = await generateReport(disbursementId, templateKey, overrides as Record<string, string> | undefined);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error("[Report API] Error:", error);
    const httpError = toHttpError(error, "Failed to generate report.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

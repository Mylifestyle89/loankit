/**
 * POST /api/report/templates/khcn/disbursement
 * Body: { customerId, templateKey, loanId?, disbursementId?, overrides? }
 * Returns generated DOCX as download.
 */
import { NextRequest, NextResponse } from "next/server";
import { generateKhcnDisbursementReport } from "@/services/khcn-report.service";
import { KHCN_DISBURSEMENT_TEMPLATES, type KhcnDisbursementTemplateKey } from "@/services/khcn-disbursement-template-config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, templateKey, loanId, disbursementId, overrides } = body as {
      customerId?: string;
      templateKey?: string;
      loanId?: string;
      disbursementId?: string;
      overrides?: Record<string, string>;
    };

    if (!customerId || !templateKey) {
      return NextResponse.json(
        { ok: false, error: "customerId and templateKey are required" },
        { status: 400 },
      );
    }

    if (!(templateKey in KHCN_DISBURSEMENT_TEMPLATES)) {
      return NextResponse.json(
        { ok: false, error: `Invalid templateKey. Valid keys: ${Object.keys(KHCN_DISBURSEMENT_TEMPLATES).join(", ")}` },
        { status: 400 },
      );
    }

    const result = await generateKhcnDisbursementReport(
      customerId,
      templateKey as KhcnDisbursementTemplateKey,
      loanId,
      disbursementId,
      overrides,
    );

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.toLowerCase().includes("not found") ? 404 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

/**
 * POST /api/report/templates/khcn/disbursement
 * Body: { customerId, templateKey, loanId?, disbursementId?, overrides? }
 * Returns generated DOCX as download.
 */
import { NextRequest, NextResponse } from "next/server";
import { generateKhcnDisbursementReport } from "@/services/khcn-report.service";
import { KHCN_DISBURSEMENT_TEMPLATES, type KhcnDisbursementTemplateKey } from "@/services/khcn-disbursement-template-config";
import { prisma } from "@/lib/prisma";

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

    if (!templateKey) {
      return NextResponse.json({ ok: false, error: "templateKey is required" }, { status: 400 });
    }

    // Resolve customerId from loanId if not provided
    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId && loanId) {
      const loan = await prisma.loan.findUnique({ where: { id: loanId }, select: { customerId: true } });
      resolvedCustomerId = loan?.customerId;
    }
    if (!resolvedCustomerId) {
      return NextResponse.json({ ok: false, error: "customerId or loanId is required" }, { status: 400 });
    }

    if (!(templateKey in KHCN_DISBURSEMENT_TEMPLATES)) {
      return NextResponse.json(
        { ok: false, error: `Invalid templateKey. Valid keys: ${Object.keys(KHCN_DISBURSEMENT_TEMPLATES).join(", ")}` },
        { status: 400 },
      );
    }

    const result = await generateKhcnDisbursementReport(
      resolvedCustomerId,
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

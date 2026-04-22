/**
 * POST /api/report/templates/khcn/generate
 * Body: { customerId, templatePath, templateLabel, loanId?, overrides? }
 * Returns generated DOCX as download.
 */
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { generateKhcnReport } from "@/services/khcn-report.service";

export const runtime = "nodejs";

/** Allowed template directory — prevent path traversal */
const ALLOWED_PREFIX = "report_assets/";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, templatePath, templateLabel, loanId, overrides, collateralIds } = body;

    if (!customerId || !templatePath) {
      return NextResponse.json(
        { ok: false, error: "customerId and templatePath are required" },
        { status: 400 },
      );
    }

    // Security: validate templatePath stays within allowed directory
    // Use forward slashes for cross-platform consistency (path.normalize uses \ on Windows)
    const resolved = path.normalize(templatePath).replace(/\\/g, "/");
    if (!resolved.startsWith(ALLOWED_PREFIX) || resolved.includes("..")) {
      return NextResponse.json(
        { ok: false, error: "Invalid template path" },
        { status: 400 },
      );
    }

    const result = await generateKhcnReport(
      customerId,
      templatePath,
      templateLabel ?? "KHCN",
      loanId,
      overrides,
      Array.isArray(collateralIds) ? collateralIds : undefined,
    );

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      output_path?: string;
      report_path?: string;
      template_path?: string;
    };
    const result = await reportService.runReportExport({
      outputPath: body.output_path,
      reportPath: body.report_path,
      templatePath: body.template_path,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Export failed.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

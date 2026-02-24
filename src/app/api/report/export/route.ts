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
      export_mode?: string;
      output_dir?: string;
      group_key?: string;
      repeat_key?: string;
      customer_name_key?: string;
    };
    const result =
      body.export_mode === "bank_grouped"
        ? await reportService.processBankReportExport({
            reportPath: body.report_path,
            templatePath: body.template_path,
            outputDir: body.output_dir,
            groupKey: body.group_key,
            repeatKey: body.repeat_key,
            customerNameKey: body.customer_name_key,
          })
        : await reportService.runReportExport({
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

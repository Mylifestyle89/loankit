import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { withRateLimit } from "@/lib/api-helpers";
import { autoProcessService } from "@/services/auto-process.service";

export const runtime = "nodejs";

type StartBody = {
  excel_path?: unknown;
  template_path?: unknown;
  job_type?: unknown;
};

export const POST = withRateLimit("auto-process-start")(async (req: NextRequest) => {
  let body: StartBody = {};
  try {
    body = (await req.json()) as StartBody;
    const result = await autoProcessService.startUniversalAutoProcess({
      excelPath: String(body.excel_path ?? ""),
      templatePath: String(body.template_path ?? ""),
      jobType: body.job_type ? String(body.job_type) : undefined,
    });
    return NextResponse.json({
      ok: true,
      job: result,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Không thể khởi tạo Auto-Process.");
    console.error("[auto-process/start]", {
      status: httpError.status,
      message: httpError.message,
      excel_path: body.excel_path,
      template_path: body.template_path,
      job_type: body.job_type,
    });
    return NextResponse.json(
      {
        ok: false,
        error: httpError.message,
        details: httpError.details,
      },
      { status: httpError.status },
    );
  }
});

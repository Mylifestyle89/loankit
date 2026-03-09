import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { run_build?: boolean; mapping_instance_id?: string };
    const result = await reportService.validateReport({
      runBuild: body.run_build === true,
      mappingInstanceId: body.mapping_instance_id,
    });
    return NextResponse.json({
      ok: true,
      source: result.source,
      validation: result.validation,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Validate failed.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

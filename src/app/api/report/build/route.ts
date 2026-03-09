import { NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await reportService.runBuildAndLog();
    return NextResponse.json({
      ok: true,
      duration_ms: result.durationMs,
      command: result.command,
      validation: result.validation,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Build failed.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

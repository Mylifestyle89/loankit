import { NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const runLogs = await reportService.loadRuns();
    return NextResponse.json({
      ok: true,
      run_logs: runLogs,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to load runs.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

import { NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireSession();
    const runLogs = await reportService.loadRuns();
    return NextResponse.json({
      ok: true,
      run_logs: runLogs,
    });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Failed to load runs.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

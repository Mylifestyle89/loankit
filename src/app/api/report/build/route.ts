import { NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function POST() {
  try {
    await requireEditorOrAdmin();
    const result = await reportService.runBuildAndLog();
    return NextResponse.json({
      ok: true,
      duration_ms: result.durationMs,
      command: result.command,
      validation: result.validation,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Build failed.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

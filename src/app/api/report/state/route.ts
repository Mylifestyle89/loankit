import { NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { handleAuthError, requireSession } from "@/lib/auth-guard";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Framework metadata only (active mapping/template IDs). Any logged-in
    // user may read this — no PII involved.
    await requireSession();
    const state = await reportService.getState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to load state.");
    return NextResponse.json(
      {
        ok: false,
        error: httpError.message,
      },
      { status: httpError.status },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const mappingInstanceId = req.nextUrl.searchParams.get("mapping_instance_id") ?? undefined;
    const freshness = await reportService.getBuildFreshness({ mappingInstanceId });
    return NextResponse.json({
      ok: true,
      freshness,
    });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Failed to evaluate build freshness.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

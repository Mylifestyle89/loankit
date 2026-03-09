import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const mappingInstanceId = req.nextUrl.searchParams.get("mapping_instance_id") ?? undefined;
    const freshness = await reportService.getBuildFreshness({ mappingInstanceId });
    return NextResponse.json({
      ok: true,
      freshness,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to evaluate build freshness.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

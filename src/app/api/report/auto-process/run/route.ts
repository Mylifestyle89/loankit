import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { withRateLimit } from "@/lib/api-helpers";
import { autoProcessService } from "@/services/auto-process.service";

export const runtime = "nodejs";

type RunBody = {
  job_id?: unknown;
  root_key?: unknown;
};

export const POST = withRateLimit("auto-process-run")(async (req: NextRequest) => {
  try {
    const body = (await req.json()) as RunBody;
    const result = await autoProcessService.runUniversalAutoProcess({
      jobId: String(body.job_id ?? ""),
      rootKey: body.root_key ? String(body.root_key) : undefined,
    });
    return NextResponse.json({
      ok: true,
      job: result,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Không thể chạy Auto-Batch.");
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

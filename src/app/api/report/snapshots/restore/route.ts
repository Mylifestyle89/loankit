import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, withValidatedBody } from "@/lib/api-helpers";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

const restoreSchema = z.object({
  filename: z.string().min(1),
});

/** POST /api/report/snapshots/restore — restore manual values + formulas from a snapshot */
export const POST = withErrorHandling(
  withValidatedBody(restoreSchema, async (body) => {
    const result = await reportService.restoreSnapshot(body.filename);
    const data = await reportService.getSnapshot(body.filename);
    return NextResponse.json({
      ok: true,
      restored: result,
      data,
    });
  }),
  "Không thể khôi phục snapshot.",
);

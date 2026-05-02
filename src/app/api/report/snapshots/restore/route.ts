import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { toHttpError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

const restoreSchema = z.object({
  filename: z.string().min(1),
});

/** POST /api/report/snapshots/restore — restore manual values + formulas from a snapshot */
export async function POST(req: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const body = restoreSchema.parse(await req.json());
    const result = await reportService.restoreSnapshot(body.filename);
    const data = await reportService.getSnapshot(body.filename);
    return NextResponse.json({ ok: true, restored: result, data });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid request body", details: error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const httpError = toHttpError(error, "Không thể khôi phục snapshot.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { autoProcessService } from "@/services/auto-process.service";

export const runtime = "nodejs";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireEditorOrAdmin();
    const { id } = await context.params;
    const result = autoProcessService.getJob(id);
    return NextResponse.json({
      ok: true,
      job: result,
    });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Không thể tải trạng thái job.");
    return NextResponse.json(
      {
        ok: false,
        error: httpError.message,
      },
      { status: httpError.status },
    );
  }
}

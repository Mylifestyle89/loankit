import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { autoProcessService } from "@/services/auto-process.service";

export const runtime = "nodejs";

type OpenBody = {
  job_id?: unknown;
};

export async function POST(req: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const body = (await req.json()) as OpenBody;
    const result = await autoProcessService.openJobOutputFolder(String(body.job_id ?? ""));
    return NextResponse.json({
      ok: true,
      output_dir: result.outputDir,
      opened_dir: result.openedDir,
    });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Không thể mở thư mục kết quả.");
    return NextResponse.json(
      {
        ok: false,
        error: httpError.message,
      },
      { status: httpError.status },
    );
  }
}

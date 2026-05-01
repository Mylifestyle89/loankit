import { NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { autoProcessService } from "@/services/auto-process.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireEditorOrAdmin();
    const result = await autoProcessService.listAssetFiles();
    return NextResponse.json({
      ok: true,
      excel_files: result.excelFiles,
      template_files: result.templateFiles,
    });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Không thể tải danh sách file.");
    return NextResponse.json(
      {
        ok: false,
        error: httpError.message,
      },
      { status: httpError.status },
    );
  }
}

import { NextResponse } from "next/server";
import { toHttpError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function POST() {
  try {
    await requireEditorOrAdmin();
    const result = await reportService.openBackupFolder();
    return NextResponse.json({
      ok: true,
      backup_dir: result.backupDir,
    });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Không thể mở thư mục backup.");
    return NextResponse.json(
      {
        ok: false,
        error: httpError.message,
      },
      { status: httpError.status },
    );
  }
}


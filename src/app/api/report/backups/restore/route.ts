import { NextRequest, NextResponse } from "next/server";
import { toHttpError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const file = req.nextUrl.searchParams.get("file");
    if (!file) {
      return NextResponse.json(
        { ok: false, error: "Thiếu tham số file." },
        { status: 400 },
      );
    }
    const content = await reportService.getStateBackupContent(file);
    return NextResponse.json({ ok: true, ...content });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Không thể đọc backup.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

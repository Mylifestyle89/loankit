import { NextRequest, NextResponse } from "next/server";
import { toHttpError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  try {
    const relPath = req.nextUrl.searchParams.get("path") ?? "";
    const mode = (req.nextUrl.searchParams.get("mode") ?? "").toLowerCase();
    const buffer = Buffer.from(await req.arrayBuffer());
    const result = await reportService.saveTemplateDocx({
      relPath,
      buffer,
      mode: mode === "backup" ? "backup" : "save",
    });
    return NextResponse.json({ ok: true, path: result.path, backup_path: result.backupPath, mode: result.mode });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to save DOCX.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}


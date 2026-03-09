import path from "node:path";

import { NextRequest, NextResponse } from "next/server";
import { toHttpError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function PUT(req: NextRequest) {
  try {
    const relPath = req.nextUrl.searchParams.get("path") ?? "";

    // Path traversal prevention
    if (!relPath || relPath.includes("..") || path.isAbsolute(relPath)) {
      return NextResponse.json({ ok: false, error: "Invalid path." }, { status: 400 });
    }

    // File extension check
    if (!relPath.toLowerCase().endsWith(".docx")) {
      return NextResponse.json({ ok: false, error: "Only .docx files allowed." }, { status: 400 });
    }

    // File size check
    const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: "File too large (max 20MB)." }, { status: 413 });
    }

    const mode = (req.nextUrl.searchParams.get("mode") ?? "").toLowerCase();
    const buffer = Buffer.from(await req.arrayBuffer());

    // Double-check actual buffer size
    if (buffer.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: "File too large (max 20MB)." }, { status: 413 });
    }

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


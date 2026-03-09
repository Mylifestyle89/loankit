import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { toHttpError, NotFoundError, ValidationError } from "@/core/errors/app-error";
import { REPORT_ASSETS_BASE, validatePathUnderBase } from "@/lib/report/path-validation";
import { verifyFileAccess } from "@/lib/report/file-token";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const relPath = req.nextUrl.searchParams.get("path") ?? "";
    const download = req.nextUrl.searchParams.get("download") === "1";
    const token = req.nextUrl.searchParams.get("token") ?? "";

    // --- Auth: require a valid HMAC token ---
    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing token." }, { status: 401 });
    }
    try {
      verifyFileAccess(relPath, token);
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid or expired token." }, { status: 403 });
    }

    // --- Path safety ---
    validatePathUnderBase(relPath, REPORT_ASSETS_BASE);
    if (!relPath.toLowerCase().endsWith(".docx")) {
      throw new ValidationError("Invalid file path.");
    }

    const resolved = path.resolve(process.cwd(), relPath);
    const buffer = await fs.readFile(resolved);
    const filename = path.basename(resolved).replace(/["\\\r\n]/g, "_");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      const nfe = new NotFoundError("File không tồn tại.");
      return NextResponse.json({ ok: false, error: nfe.message }, { status: nfe.status });
    }
    const httpError = toHttpError(error, "Failed to read file.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { toHttpError, NotFoundError, ValidationError } from "@/core/errors/app-error";

export const runtime = "nodejs";

const allowedBase = path.resolve(process.cwd(), "report_assets");

export async function GET(req: NextRequest) {
  try {
    const relPath = req.nextUrl.searchParams.get("path") ?? "";
    const download = req.nextUrl.searchParams.get("download") === "1";

    const resolved = path.resolve(process.cwd(), relPath);
    const withinBase = resolved.startsWith(allowedBase + path.sep) || resolved === allowedBase;
    const isDocx = relPath.toLowerCase().endsWith(".docx");
    if (!withinBase || !isDocx) {
      throw new ValidationError("Invalid file path.");
    }

    const buffer = await fs.readFile(resolved);
    const filename = path.basename(resolved);

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

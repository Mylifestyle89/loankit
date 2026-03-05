import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/onlyoffice/config";
import { REPORT_ASSETS_BASE, validatePathUnderBase } from "@/lib/report/path-validation";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const relPath = req.nextUrl.searchParams.get("path") ?? "";
    const token = req.nextUrl.searchParams.get("token") ?? "";

    if (!token) {
      return NextResponse.json({ error: "Missing token." }, { status: 401 });
    }

    // Verify JWT
    const payload = verifyToken(token);
    if (payload.action !== "download" || payload.path !== relPath) {
      return NextResponse.json({ error: "Invalid token." }, { status: 403 });
    }

    // Path safety — OS-agnostic containment check
    validatePathUnderBase(relPath, REPORT_ASSETS_BASE);
    if (!relPath.toLowerCase().endsWith(".docx")) {
      return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
    }

    const resolved = path.resolve(process.cwd(), relPath);
    const buffer = await fs.readFile(resolved);
    const filename = path.basename(resolved).replace(/["\\\r\n]/g, "_");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }
    const msg = error instanceof Error ? error.message : "Download failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

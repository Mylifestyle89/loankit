import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/onlyoffice/config";

export const runtime = "nodejs";

const allowedBase = path.resolve(process.cwd(), "report_assets");

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

    const resolved = path.resolve(process.cwd(), relPath);
    const withinBase = resolved.startsWith(allowedBase + path.sep) || resolved === allowedBase;
    if (!withinBase || !relPath.toLowerCase().endsWith(".docx")) {
      return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
    }

    const buffer = await fs.readFile(resolved);
    const filename = path.basename(resolved);

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

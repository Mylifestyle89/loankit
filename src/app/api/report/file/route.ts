import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isSafeReportAssetPath(relPath: string): boolean {
  if (!relPath.startsWith("report_assets/")) {
    return false;
  }
  if (relPath.includes("..")) {
    return false;
  }
  return relPath.toLowerCase().endsWith(".docx");
}

export async function GET(req: NextRequest) {
  try {
    const relPath = req.nextUrl.searchParams.get("path") ?? "";
    const download = req.nextUrl.searchParams.get("download") === "1";

    if (!isSafeReportAssetPath(relPath)) {
      return NextResponse.json({ ok: false, error: "Invalid file path." }, { status: 400 });
    }

    const absolute = path.join(process.cwd(), relPath);
    const buffer = await fs.readFile(absolute);
    const filename = path.basename(relPath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to read file." },
      { status: 404 },
    );
  }
}

import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isSafeDocxPath(relPath: string): boolean {
  if (!relPath.startsWith("report_assets/")) return false;
  if (relPath.includes("..")) return false;
  return relPath.toLowerCase().endsWith(".docx");
}

export async function PUT(req: NextRequest) {
  try {
    const relPath = req.nextUrl.searchParams.get("path") ?? "";
    if (!isSafeDocxPath(relPath)) {
      return NextResponse.json({ ok: false, error: "Invalid docx path." }, { status: 400 });
    }

    const buffer = Buffer.from(await req.arrayBuffer());
    if (buffer.byteLength < 100) {
      return NextResponse.json({ ok: false, error: "Invalid DOCX payload." }, { status: 400 });
    }

    const absolute = path.join(process.cwd(), relPath);
    await fs.writeFile(absolute, buffer);

    return NextResponse.json({ ok: true, path: relPath });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to save DOCX." },
      { status: 500 },
    );
  }
}


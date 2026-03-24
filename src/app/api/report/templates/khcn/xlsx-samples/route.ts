/**
 * GET  /api/report/templates/khcn/xlsx-samples         — list sample XLSX files
 * GET  /api/report/templates/khcn/xlsx-samples?file=... — download specific file
 * POST /api/report/templates/khcn/xlsx-samples         — upload new sample XLSX
 */
import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SAMPLES_DIR = "report_assets/KHCN templates/Phương án vay vốn xlsx";

function getSamplesAbsDir(): string {
  return path.join(process.cwd(), SAMPLES_DIR);
}

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get("file");

  // Download specific file
  if (file) {
    if (file.includes("..") || file.includes("/") || file.includes("\\")) {
      return NextResponse.json({ ok: false, error: "Invalid filename" }, { status: 400 });
    }
    const absPath = path.join(getSamplesAbsDir(), file);
    try {
      const buffer = await fs.readFile(absPath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file)}`,
        },
      });
    } catch {
      return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
    }
  }

  // List all sample XLSX files
  try {
    const entries = await fs.readdir(getSamplesAbsDir(), { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".xlsx"))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, "vi"));
    return NextResponse.json({ ok: true, files });
  } catch {
    return NextResponse.json({ ok: true, files: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || !file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ ok: false, error: "XLSX file required" }, { status: 400 });
    }

    const safeName = file.name.replace(/[<>:"/\\|?*]+/g, "_");
    const absDir = getSamplesAbsDir();
    await fs.mkdir(absDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(absDir, safeName), buffer);

    return NextResponse.json({ ok: true, filename: safeName });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

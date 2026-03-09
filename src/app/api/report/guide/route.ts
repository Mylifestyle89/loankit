import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const GUIDE_PATH = path.join(process.cwd(), "docs", "user-guide.md");

/** GET /api/report/guide — return guide markdown content */
export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format");

  if (!fs.existsSync(GUIDE_PATH)) {
    return NextResponse.json({ ok: false, error: "Guide not found" }, { status: 404 });
  }

  const content = fs.readFileSync(GUIDE_PATH, "utf-8");

  if (format === "download") {
    // Return raw markdown as downloadable file
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'attachment; filename="huong-dan-su-dung.md"',
      },
    });
  }

  return NextResponse.json({ ok: true, content });
}

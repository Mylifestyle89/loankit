import path from "node:path";

import { NextRequest, NextResponse } from "next/server";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

const allowedBase = path.resolve(process.cwd(), "report_assets");

type CallbackBody = {
  status: number;
  key?: string;
  url?: string;
  token?: string;
  users?: string[];
  changesurl?: string;
};

/**
 * OnlyOffice callback handler.
 *
 * Status codes:
 *   0 = editing
 *   1 = closed without saving
 *   2 = ready to save (all users closed) → SAVE
 *   3 = save error
 *   4 = closed with no changes
 *   6 = force save → SAVE
 *   7 = force save error
 */
export async function POST(req: NextRequest) {
  try {
    const relPath = req.nextUrl.searchParams.get("path") ?? "";

    const resolved = path.resolve(process.cwd(), relPath);
    const withinBase = resolved.startsWith(allowedBase + path.sep) || resolved === allowedBase;
    if (!withinBase || !relPath.toLowerCase().endsWith(".docx")) {
      return NextResponse.json({ error: 1 }, { status: 400 });
    }

    const body = (await req.json()) as CallbackBody;
    const { status, url } = body;

    // Save on status 2 (all users closed) or 6 (force save)
    if ((status === 2 || status === 6) && url) {
      // Download the saved file from OnlyOffice server
      const fileRes = await fetch(url);
      if (!fileRes.ok) {
        console.error(`[onlyoffice/callback] Failed to download from OnlyOffice: ${fileRes.status}`);
        return NextResponse.json({ error: 1 });
      }

      const buffer = Buffer.from(await fileRes.arrayBuffer());

      // Save using existing service (creates backup automatically)
      await reportService.saveTemplateDocx({
        relPath,
        buffer,
        mode: "save",
      });

      console.log(`[onlyoffice/callback] Saved ${relPath} (${buffer.length} bytes, status=${status})`);
    }

    // Always return { error: 0 } to acknowledge
    return NextResponse.json({ error: 0 });
  } catch (error) {
    console.error("[onlyoffice/callback] Error:", error);
    return NextResponse.json({ error: 1 });
  }
}

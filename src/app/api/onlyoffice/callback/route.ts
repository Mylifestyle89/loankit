import path from "node:path";

import { NextRequest, NextResponse } from "next/server";
import { reportService } from "@/services/report.service";
import { verifyToken, ONLYOFFICE_URL } from "@/lib/onlyoffice/config";
import { REPORT_ASSETS_BASE, validatePathUnderBase } from "@/lib/report/path-validation";

export const runtime = "nodejs";

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
    const token = req.nextUrl.searchParams.get("token") ?? "";

    // Verify JWT token
    if (!token) {
      return NextResponse.json({ error: 1 }, { status: 401 });
    }
    try {
      const payload = verifyToken(token);
      if (payload.action !== "callback" || payload.path !== relPath) {
        return NextResponse.json({ error: 1 }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 1 }, { status: 403 });
    }

    // Path safety — OS-agnostic containment check
    try {
      validatePathUnderBase(relPath, REPORT_ASSETS_BASE);
    } catch {
      return NextResponse.json({ error: 1 }, { status: 400 });
    }
    if (!relPath.toLowerCase().endsWith(".docx")) {
      return NextResponse.json({ error: 1 }, { status: 400 });
    }

    const body = (await req.json()) as CallbackBody;
    const { status, url } = body;

    // Save on status 2 (all users closed) or 6 (force save)
    if ((status === 2 || status === 6) && url) {
      // Validate download URL: must come from the configured OnlyOffice server only.
      // SECURITY: do NOT allow generic "localhost" — that enables SSRF to other local services.
      const parsedUrl = new URL(url);
      const onlyOfficeOrigin = new URL(ONLYOFFICE_URL);
      if (
        parsedUrl.hostname !== onlyOfficeOrigin.hostname ||
        parsedUrl.port !== (onlyOfficeOrigin.port || (onlyOfficeOrigin.protocol === "https:" ? "443" : "80")) ||
        !["http:", "https:"].includes(parsedUrl.protocol)
      ) {
        console.error(`[onlyoffice/callback] Rejected download URL from untrusted origin: ${parsedUrl.origin}`);
        return NextResponse.json({ error: 1 });
      }

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

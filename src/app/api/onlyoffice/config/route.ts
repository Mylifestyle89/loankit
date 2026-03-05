import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { ONLYOFFICE_URL, APP_URL, signToken } from "@/lib/onlyoffice/config";
import { REPORT_ASSETS_BASE, validatePathUnderBase } from "@/lib/report/path-validation";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const relPath = req.nextUrl.searchParams.get("path") ?? "";
    if (!relPath) {
      return NextResponse.json({ ok: false, error: "Missing path param." }, { status: 400 });
    }

    // Path safety — OS-agnostic containment check
    validatePathUnderBase(relPath, REPORT_ASSETS_BASE);
    if (!relPath.toLowerCase().endsWith(".docx")) {
      return NextResponse.json({ ok: false, error: "Invalid file path." }, { status: 400 });
    }

    // Generate unique key from path + file modification time
    const resolved = path.resolve(process.cwd(), relPath);
    const stat = await fs.stat(resolved);
    const raw = `${relPath}:${stat.mtimeMs}`;
    const documentKey = crypto.createHash("md5").update(raw).digest("hex").slice(0, 20);

    const filename = path.basename(resolved);

    // Build download URL with JWT token
    const downloadToken = signToken({ path: relPath, action: "download" });
    const documentUrl = `${APP_URL}/api/onlyoffice/download?path=${encodeURIComponent(relPath)}&token=${encodeURIComponent(downloadToken)}`;

    // Build callback URL
    const callbackToken = signToken({ path: relPath, action: "callback" });
    const callbackUrl = `${APP_URL}/api/onlyoffice/callback?path=${encodeURIComponent(relPath)}&token=${encodeURIComponent(callbackToken)}`;

    // OnlyOffice editor config
    const config = {
      document: {
        fileType: "docx",
        key: documentKey,
        title: filename,
        url: documentUrl,
      },
      documentType: "word",
      editorConfig: {
        callbackUrl,
        lang: "vi",
        mode: "edit",
        customization: {
          autosave: true,
          forcesave: true,
          compactHeader: false,
          compactToolbar: false,
          hideRightMenu: false,
          logo: { visible: false },
          toolbarNoTabs: false,
        },
      },
    };

    // Sign entire config as JWT token for OnlyOffice verification
    const token = signToken(config);

    return NextResponse.json({
      ok: true,
      config: { ...config, token },
      documentServerUrl: ONLYOFFICE_URL,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to generate config.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

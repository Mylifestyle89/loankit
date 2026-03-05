import { NextRequest, NextResponse } from "next/server";

import { signFileAccess } from "@/lib/report/file-token";
import { REPORT_ASSETS_BASE, validatePathUnderBase } from "@/lib/report/path-validation";

export const runtime = "nodejs";

/** Generate a short-lived HMAC token for downloading a report file. */
export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get("path") ?? "";
  if (!filePath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  // Validate path before signing — never issue tokens for paths outside report_assets
  try {
    validatePathUnderBase(filePath, REPORT_ASSETS_BASE);
  } catch {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  if (!filePath.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const token = signFileAccess(filePath);
  return NextResponse.json({ token });
}

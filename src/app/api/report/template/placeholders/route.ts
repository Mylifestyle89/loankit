import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import { parseDocxPlaceholdersFromBuffer } from "@/lib/report/template-parser";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

/**
 * GET /api/report/template/placeholders?template_id=xxx
 * Returns placeholder keys extracted from a registered template's DOCX file.
 * Also supports ?all=true to return placeholders for ALL registered templates (for field usage map).
 */
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = req.nextUrl;
    const returnAll = searchParams.get("all") === "true";
    const templateId = searchParams.get("template_id");

    const { templates: profiles } = await reportService.getTemplates();

    if (returnAll) {
      // Phase 4: Return field_key → template_name[] mapping for all templates
      const usageMap: Record<string, string[]> = {};
      for (const profile of profiles) {
        const placeholders = await extractPlaceholdersFromProfile(profile.docx_path);
        for (const ph of placeholders) {
          if (!usageMap[ph]) usageMap[ph] = [];
          usageMap[ph].push(profile.template_name);
        }
      }
      return NextResponse.json({ ok: true, usage_map: usageMap });
    }

    // Single template mode
    if (!templateId) {
      return NextResponse.json({ ok: false, error: "template_id là bắt buộc." }, { status: 400 });
    }

    const profile = profiles.find((p: { id: string }) => p.id === templateId);
    if (!profile) {
      return NextResponse.json({ ok: false, error: "Không tìm thấy template." }, { status: 404 });
    }

    const placeholders = await extractPlaceholdersFromProfile(profile.docx_path);
    return NextResponse.json({ ok: true, placeholders, template_name: profile.template_name });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Lỗi đọc placeholders từ template.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

/** Read DOCX file and extract placeholder keys, filtering false positives */
async function extractPlaceholdersFromProfile(docxPath: string): Promise<string[]> {
  const fullPath = path.resolve(process.cwd(), docxPath);
  // Path traversal guard: ensure resolved path stays within project directory
  if (!fullPath.startsWith(process.cwd())) {
    throw new Error("Invalid template path: outside project directory.");
  }
  const buffer = Buffer.from(await fs.readFile(fullPath));
  const raw = await parseDocxPlaceholdersFromBuffer(buffer);
  // Filter: only alphanumeric, underscore, dot, hyphen — no spaces or long strings
  return raw.filter((ph) => ph.length <= 50 && /^[a-zA-Z0-9_.\-#/]+$/.test(ph));
}

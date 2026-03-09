import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { parseDocxPlaceholdersFromBuffer } from "@/lib/report/template-parser";
import { suggestAliasForPlaceholder } from "@/lib/report/placeholder-utils";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

// [RT-3] Filter natural-text false positives inside brackets
const FALSE_POSITIVE_RE = /\s/;

function isLikelyPlaceholder(ph: string): boolean {
  if (ph.length > 50) return false;
  if (FALSE_POSITIVE_RE.test(ph)) return false;
  // Only allow alphanumeric, underscore, dot, hyphen
  return /^[a-zA-Z0-9_.\-]+$/.test(ph);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fieldTemplateId = formData.get("field_template_id") as string | null;

    // Validate inputs
    if (!file || !file.name.toLowerCase().endsWith(".docx")) {
      return NextResponse.json({ ok: false, error: "Vui lòng tải lên file .docx." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: "File quá lớn (tối đa 20MB)." }, { status: 413 });
    }
    if (!fieldTemplateId) {
      return NextResponse.json({ ok: false, error: "field_template_id là bắt buộc." }, { status: 400 });
    }

    // [RT-6] Validate field_template_id exists
    const templates = await reportService.listFieldTemplates({});
    const template = templates.find((t) => t.id === fieldTemplateId);
    if (!template) {
      return NextResponse.json({ ok: false, error: "Không tìm thấy field template." }, { status: 404 });
    }

    // [RT-2] Buffer for JSZip parsing (size already validated above via file.size)
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse placeholders from DOCX
    const rawPlaceholders = await parseDocxPlaceholdersFromBuffer(buffer);

    // [RT-3] Filter false positives
    const placeholders = rawPlaceholders.filter(isLikelyPlaceholder);

    // Build field catalog lookup
    const catalog = template.field_catalog ?? [];
    const fieldKeyMap = new Map(catalog.map((f) => [f.field_key, f]));
    const fieldKeys = catalog.map((f) => f.field_key);

    // Categorize: valid, unknown, missing
    const valid: { placeholder: string; field_key: string; label_vi: string }[] = [];
    const unknown: { placeholder: string; suggestions: string[] }[] = [];
    const placeholderSet = new Set(placeholders);

    for (const ph of placeholders) {
      const field = fieldKeyMap.get(ph);
      if (field) {
        valid.push({ placeholder: ph, field_key: field.field_key, label_vi: field.label_vi });
      } else {
        unknown.push({ placeholder: ph, suggestions: suggestAliasForPlaceholder(ph, fieldKeys) });
      }
    }

    const missing = catalog
      .filter((f) => !placeholderSet.has(f.field_key))
      .map((f) => ({ field_key: f.field_key, label_vi: f.label_vi, group: f.group }));

    return NextResponse.json({
      ok: true,
      total_placeholders: placeholders.length,
      total_catalog_fields: catalog.length,
      valid,
      unknown,
      missing,
    });
  } catch (error) {
    // [RT-7] Proper error handling
    const httpError = toHttpError(error, "Lỗi kiểm tra template.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

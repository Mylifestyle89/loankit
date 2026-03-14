/**
 * GET /api/report/templates/khcn?loan_method=tung_lan
 * Returns KHCN DOCX templates filtered by loan method, grouped by category.
 */
import { NextRequest, NextResponse } from "next/server";

import { getTemplatesForMethod, groupByCategory, DOC_CATEGORY_LABELS, ASSET_CATEGORY_KEYS } from "@/lib/loan-plan/khcn-template-registry";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const method = req.nextUrl.searchParams.get("loan_method") ?? "tung_lan";
  const templates = getTemplatesForMethod(method);
  const grouped = groupByCategory(templates);

  // Convert to ordered array with labels
  const categories = Object.entries(grouped).map(([key, items]) => ({
    key,
    label: DOC_CATEGORY_LABELS[key] ?? key,
    isAsset: ASSET_CATEGORY_KEYS.has(key),
    templates: items.map((t) => ({ path: t.path, name: t.name })),
  }));

  return NextResponse.json({ ok: true, method, categories, total: templates.length });
}

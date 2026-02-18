import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { loadState } from "@/lib/report/fs-store";
import { loadManualValues, saveManualValues } from "@/lib/report/manual-values";
import { runBuildAndValidate } from "@/lib/report/pipeline-client";

export const runtime = "nodejs";

async function loadFlatDraft(): Promise<Record<string, unknown>> {
  const flatPath = path.join(process.cwd(), "report_assets/report_draft_flat.json");
  try {
    const raw = await fs.readFile(flatPath, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    await runBuildAndValidate();
    const raw = await fs.readFile(flatPath, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  }
}

export async function GET() {
  try {
    const [state, flatValues, manualValues] = await Promise.all([loadState(), loadFlatDraft(), loadManualValues()]);

    return NextResponse.json({
      ok: true,
      field_catalog: state.field_catalog,
      auto_values: flatValues,
      values: { ...flatValues, ...manualValues },
      manual_values: manualValues,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load field values.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as { manual_values?: Record<string, string | number | boolean | null> };
    if (!body.manual_values || typeof body.manual_values !== "object") {
      return NextResponse.json({ ok: false, error: "manual_values is required." }, { status: 400 });
    }
    const saved = await saveManualValues(body.manual_values);
    return NextResponse.json({ ok: true, manual_values: saved });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to save manual values." },
      { status: 400 },
    );
  }
}

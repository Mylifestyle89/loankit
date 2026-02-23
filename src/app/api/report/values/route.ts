import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { loadState } from "@/lib/report/fs-store";
import { loadFieldFormulas, saveFieldFormulas } from "@/lib/report/field-formulas";
import { evaluateFieldFormula } from "@/lib/report/field-calc";
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
    const [state, flatValues, manualValues, fieldFormulas] = await Promise.all([
      loadState(),
      loadFlatDraft(),
      loadManualValues(),
      loadFieldFormulas(),
    ]);

    return NextResponse.json({
      ok: true,
      field_catalog: state.field_catalog,
      auto_values: flatValues,
      values: { ...flatValues, ...manualValues },
      manual_values: manualValues,
      field_formulas: fieldFormulas,
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
    const body = (await req.json()) as {
      manual_values?: Record<string, string | number | boolean | null>;
      field_formulas?: Record<string, string>;
    };
    if (!body.manual_values || typeof body.manual_values !== "object") {
      return NextResponse.json({ ok: false, error: "manual_values is required." }, { status: 400 });
    }
    const [flat, state] = await Promise.all([loadFlatDraft(), loadState()]);
    const fieldTypeMap = new Map((state.field_catalog ?? []).map((f) => [f.field_key, f.type]));
    const toSave = { ...body.manual_values };
    if (body.field_formulas && typeof body.field_formulas === "object") {
      for (const [key, formula] of Object.entries(body.field_formulas)) {
        const ctx = { ...flat, ...toSave };
        const fieldType = fieldTypeMap.get(key) ?? "text";
        const v = evaluateFieldFormula(formula, ctx, fieldType);
        if (v !== null) toSave[key] = v;
      }
    }
    const [savedManual, savedFormulas] = await Promise.all([
      saveManualValues(toSave),
      body.field_formulas && typeof body.field_formulas === "object"
        ? saveFieldFormulas(body.field_formulas)
        : Promise.resolve({}),
    ]);
    return NextResponse.json({
      ok: true,
      manual_values: savedManual,
      field_formulas: savedFormulas,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to save manual values." },
      { status: 400 },
    );
  }
}

/**
 * Field-values service — auto/manual field values & formulas.
 */
import { ValidationError } from "@/core/errors/app-error";
import { enrichContextWithLabels } from "@/core/use-cases/formula-processor";
import { docxEngine } from "@/lib/docx-engine";
import { evaluateFieldFormula } from "@/lib/report/field-calc";
import { loadFieldFormulas, saveFieldFormulas } from "@/lib/report/field-formulas";
import { loadState } from "@/lib/report/fs-store";
import { loadManualValues, saveManualValues } from "@/lib/report/manual-values";
import { runBuildAndValidate } from "@/lib/report/pipeline-client";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function loadFlatDraftWithBuildFallback(): Promise<Record<string, unknown>> {
  try {
    return await docxEngine.readJson<Record<string, unknown>>("report_assets/report_draft_flat.json");
  } catch {
    await runBuildAndValidate();
    return await docxEngine.readJson<Record<string, unknown>>("report_assets/report_draft_flat.json");
  }
}

// ---------------------------------------------------------------------------
// Field-values Service
// ---------------------------------------------------------------------------

export const fieldValuesService = {
  async getFieldValues() {
    const [state, flatValues, manualValues, fieldFormulas] = await Promise.all([
      loadState(),
      loadFlatDraftWithBuildFallback(),
      loadManualValues(),
      loadFieldFormulas(),
    ]);
    return {
      field_catalog: state.field_catalog,
      auto_values: flatValues,
      values: { ...flatValues, ...manualValues },
      manual_values: manualValues,
      field_formulas: fieldFormulas,
    };
  },

  async saveFieldValues(input: {
    manualValues?: Record<string, string | number | boolean | null>;
    fieldFormulas?: Record<string, string>;
  }) {
    if (!input.manualValues || typeof input.manualValues !== "object") {
      throw new ValidationError("manual_values is required.");
    }

    const [flat, state] = await Promise.all([loadFlatDraftWithBuildFallback(), loadState()]);
    const fieldCatalog = state.field_catalog ?? [];
    const fieldTypeMap = new Map(fieldCatalog.map((f) => [f.field_key, f.type]));
    const toSave = { ...input.manualValues };
    if (input.fieldFormulas && typeof input.fieldFormulas === "object") {
      for (const [key, formula] of Object.entries(input.fieldFormulas)) {
        const baseCtx = { ...flat, ...toSave };
        const ctx = enrichContextWithLabels(baseCtx, fieldCatalog);
        const fieldType = fieldTypeMap.get(key) ?? "text";
        const v = evaluateFieldFormula(formula, ctx, fieldType);
        if (v !== null) toSave[key] = v;
      }
    }

    const [savedManual, savedFormulas] = await Promise.all([
      saveManualValues(toSave),
      input.fieldFormulas && typeof input.fieldFormulas === "object"
        ? saveFieldFormulas(input.fieldFormulas)
        : Promise.resolve({}),
    ]);
    return { manual_values: savedManual, field_formulas: savedFormulas };
  },
};

/**
 * Field-values service — auto/manual field values & formulas.
 */
import path from "node:path";
import { ValidationError } from "@/core/errors/app-error";
import { enrichContextWithLabels } from "@/core/use-cases/formula-processor";
import { docxEngine } from "@/lib/docx-engine";
import { prisma } from "@/lib/prisma";
import { evaluateFieldFormula } from "@/lib/report/field-calc";
import { loadFieldFormulas, saveFieldFormulas } from "@/lib/report/field-formulas";
import { loadState } from "@/lib/report/fs-store";
import { loadManualValues, saveManualValues } from "@/lib/report/manual-values";
import { runBuildAndValidate } from "@/lib/report/pipeline-client";
import { parseFieldCatalogJson } from "./_shared";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function loadFlatDraftWithBuildFallback(): Promise<Record<string, unknown>> {
  try {
    return await docxEngine.readJson<Record<string, unknown>>("report_assets/generated/report_draft_flat.json");
  } catch {
    await runBuildAndValidate();
    return await docxEngine.readJson<Record<string, unknown>>("report_assets/generated/report_draft_flat.json");
  }
}

async function resolveScopedStorage(mappingInstanceId?: string): Promise<{
  fieldCatalog: Awaited<ReturnType<typeof loadState>>["field_catalog"];
  manualValuesPath?: string;
  fieldFormulasPath?: string;
  /** Phase 3.5: resolved Loan FK for upcoming valuesService swap (Phase 4 full). */
  loanId?: string | null;
}> {
  if (!mappingInstanceId) {
    const state = await loadState();
    return { fieldCatalog: state.field_catalog, loanId: null };
  }

  const instance = await prisma.mappingInstance.findUnique({
    where: { id: mappingInstanceId },
  });
  if (!instance) {
    throw new ValidationError("Mapping instance not found.");
  }

  const basePath = instance.mappingJsonPath.replace(/\.mapping\.json$/i, "");
  const fallbackBase = path.join(
    path.dirname(instance.mappingJsonPath),
    path.basename(instance.mappingJsonPath, path.extname(instance.mappingJsonPath)),
  );
  const stem = basePath === instance.mappingJsonPath ? fallbackBase : basePath;
  return {
    fieldCatalog: parseFieldCatalogJson(instance.fieldCatalogJson),
    manualValuesPath: `${stem}.manual_values.json`,
    fieldFormulasPath: `${stem}.field_formulas.json`,
    loanId: instance.loanId,
  };
}

// ---------------------------------------------------------------------------
// Field-values Service
// ---------------------------------------------------------------------------

export const fieldValuesService = {
  async getFieldValues(params?: { mappingInstanceId?: string }) {
    const scope = await resolveScopedStorage(params?.mappingInstanceId);
    const [flatValues, manualValues, fieldFormulas] = await Promise.all([
      loadFlatDraftWithBuildFallback(),
      loadManualValues(scope.manualValuesPath),
      loadFieldFormulas(scope.fieldFormulasPath),
    ]);
    return {
      field_catalog: scope.fieldCatalog,
      auto_values: flatValues,
      values: { ...flatValues, ...manualValues },
      manual_values: manualValues,
      field_formulas: fieldFormulas,
    };
  },

  async saveFieldValues(input: {
    manualValues?: Record<string, string | number | boolean | null | Record<string, unknown>[]>;
    fieldFormulas?: Record<string, string>;
    mappingInstanceId?: string;
  }) {
    if (!input.manualValues || typeof input.manualValues !== "object") {
      throw new ValidationError("manual_values is required.");
    }

    const scope = await resolveScopedStorage(input.mappingInstanceId);
    const flat = await loadFlatDraftWithBuildFallback();
    const fieldCatalog = scope.fieldCatalog ?? [];
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
      saveManualValues(toSave, scope.manualValuesPath),
      input.fieldFormulas && typeof input.fieldFormulas === "object"
        ? saveFieldFormulas(input.fieldFormulas, scope.fieldFormulasPath)
        : Promise.resolve({}),
    ]);
    return { manual_values: savedManual, field_formulas: savedFormulas };
  },
};

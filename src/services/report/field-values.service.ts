/**
 * Field-values service — auto/manual field values & formulas.
 *
 * Phase 4 full: reads/writes route through valuesService (DB) when loanId
 * is resolved from MappingInstance.loanId (added Phase 3.5). FS fallback
 * gated by REPORT_LEGACY_FALLBACK flag — flipped off in Phase 5.
 */
import path from "node:path";
import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import { enrichContextWithLabels } from "@/core/use-cases/formula-processor";
import { docxEngine } from "@/lib/docx-engine";
import { prisma } from "@/lib/prisma";
import { isLegacyFallbackEnabled } from "@/lib/report/constants";
import { evaluateFieldFormula } from "@/lib/report/field-calc";
import { loadFieldFormulas, saveFieldFormulas } from "@/lib/report/field-formulas";
import { loadState } from "@/lib/report/fs-store";
import { loadManualValues, saveManualValues } from "@/lib/report/manual-values";
import { runBuildAndValidate } from "@/lib/report/pipeline-client";
import type { ValuesRecord } from "@/lib/report/values-schema";
import { parseFieldCatalogJson } from "./_shared";
import { valuesService } from "./values.service";

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
  loanId?: string | null;
}> {
  if (!mappingInstanceId) {
    const state = await loadState();
    return { fieldCatalog: state.field_catalog, loanId: null };
  }

  const instance = await prisma.mappingInstance.findUnique({
    where: { id: mappingInstanceId },
    select: { mappingJsonPath: true, fieldCatalogJson: true, loanId: true },
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

const LOG_PREFIX = "[report-values]";

/** Read dossier values for an instance.
 *  loanId present → DB only (stale FK falls through to {}).
 *  loanId null + flag on → instance-scoped FS file (per-instance, not global).
 *  loanId null + flag off → {}. */
async function readScopedManualValues(
  loanId: string | null | undefined,
  fsPath: string | undefined,
): Promise<ValuesRecord> {
  if (loanId) {
    try {
      return await valuesService.getDossierValues(loanId);
    } catch (e) {
      if (e instanceof NotFoundError) {
        console.warn(`${LOG_PREFIX} loan ${loanId} not found, treating dossier as empty.`);
        return {};
      }
      throw e;
    }
  }
  if (!isLegacyFallbackEnabled()) return {};
  console.warn(`${LOG_PREFIX} FS fallback used (instance has no loanId).`);
  return await loadManualValues(fsPath);
}

/** Write dossier values. DB authoritative when loanId present; instance-scoped
 *  FS shim mirrors writes while flag enabled (Phase 5 removes the FS branch). */
async function writeScopedManualValues(
  loanId: string | null | undefined,
  values: ValuesRecord,
  fsPath: string | undefined,
): Promise<ValuesRecord> {
  if (loanId) {
    await valuesService.saveDossierValues(loanId, values);
  }
  if (isLegacyFallbackEnabled()) {
    return await saveManualValues(values, fsPath);
  }
  return values;
}

// ---------------------------------------------------------------------------
// Field-values Service
// ---------------------------------------------------------------------------

export const fieldValuesService = {
  async getFieldValues(params?: { mappingInstanceId?: string }) {
    const scope = await resolveScopedStorage(params?.mappingInstanceId);
    const [flatValues, manualValues, fieldFormulas] = await Promise.all([
      loadFlatDraftWithBuildFallback(),
      readScopedManualValues(scope.loanId, scope.manualValuesPath),
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
    manualValues?: ValuesRecord;
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
    const toSave: ValuesRecord = { ...input.manualValues };
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
      writeScopedManualValues(scope.loanId, toSave, scope.manualValuesPath),
      input.fieldFormulas && typeof input.fieldFormulas === "object"
        ? saveFieldFormulas(input.fieldFormulas, scope.fieldFormulasPath)
        : Promise.resolve({}),
    ]);
    return { manual_values: savedManual, field_formulas: savedFormulas };
  },
};

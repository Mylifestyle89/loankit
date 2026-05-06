/**
 * Field-values service — auto/manual field values & formulas.
 *
 * Reads/writes dossier values via valuesService (DB) using the loanId
 * resolved from MappingInstance.loanId. Instances without a loanId cannot
 * persist manual values — saveFieldValues throws so the UI surfaces the
 * link-the-loan fix rather than silently dropping the user's edits.
 *
 * Formulas: Phase 6 added MasterTemplate.formulasJson. Reads prefer the
 * master when the instance links to one; FS path remains as fallback for
 * legacy instances and is retired together with MappingInstance.
 */
import path from "node:path";
import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import { enrichContextWithLabels } from "@/core/use-cases/formula-processor";
import { docxEngine } from "@/lib/docx-engine";
import { prisma } from "@/lib/prisma";
import { evaluateFieldFormula } from "@/lib/report/field-calc";
import { loadFieldFormulas, saveFieldFormulas } from "@/lib/report/field-formulas";
import { loadState } from "@/lib/report/fs-store";
import { runBuildAndValidate } from "@/lib/report/pipeline-client";
import { valuesRecordSchema, type ValuesRecord } from "@/lib/report/values-schema";
import { parseFieldCatalogJson } from "./_shared";
import { masterTemplateService } from "./master-template.service";
import { valuesService } from "./values.service";

const LOG_PREFIX = "[report-values]";

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
  fieldFormulasPath?: string;
  loanId: string | null;
  masterTemplateId: string | null;
}> {
  if (!mappingInstanceId) {
    const state = await loadState();
    return { fieldCatalog: state.field_catalog, loanId: null, masterTemplateId: null };
  }

  const instance = await prisma.mappingInstance.findUnique({
    where: { id: mappingInstanceId },
    select: { mappingJsonPath: true, fieldCatalogJson: true, loanId: true, masterId: true },
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
    fieldFormulasPath: `${stem}.field_formulas.json`,
    loanId: instance.loanId,
    masterTemplateId: instance.masterId,
  };
}

/** Read formulas: prefer MasterTemplate.formulasJson when populated,
 *  fall back to FS file (legacy per-instance path) otherwise. */
async function readFormulas(
  masterTemplateId: string | null,
  fsPath: string | undefined,
): Promise<Record<string, string>> {
  if (masterTemplateId) {
    try {
      const fromMaster = await masterTemplateService.getFormulasForTemplate(masterTemplateId);
      if (Object.keys(fromMaster).length > 0) return fromMaster;
    } catch (e) {
      if (!(e instanceof NotFoundError)) throw e;
    }
  }
  return await loadFieldFormulas(fsPath);
}

async function readDossierValues(loanId: string | null): Promise<ValuesRecord> {
  if (!loanId) return {};
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

export const fieldValuesService = {
  async getFieldValues(params?: { mappingInstanceId?: string }) {
    const scope = await resolveScopedStorage(params?.mappingInstanceId);
    const [flatValues, manualValues, fieldFormulas] = await Promise.all([
      loadFlatDraftWithBuildFallback(),
      readDossierValues(scope.loanId),
      readFormulas(scope.masterTemplateId, scope.fieldFormulasPath),
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

    if (!scope.loanId) {
      throw new ValidationError(
        "Mapping instance is not linked to a loan. Run the backfill script or link the instance before saving.",
      );
    }

    // Formulas write: master-first when available, FS otherwise (Phase 7 drops FS).
    const writeFormulas = async (): Promise<Record<string, string>> => {
      if (!input.fieldFormulas || typeof input.fieldFormulas !== "object") return {};
      if (scope.masterTemplateId) {
        await masterTemplateService.setFormulasForTemplate(scope.masterTemplateId, input.fieldFormulas);
        return input.fieldFormulas;
      }
      return await saveFieldFormulas(input.fieldFormulas, scope.fieldFormulasPath);
    };
    const [, savedFormulas] = await Promise.all([
      valuesService.saveDossierValues(scope.loanId, toSave),
      writeFormulas(),
    ]);
    // Echo the canonical parsed values so callers see what the DB will see
    // (Zod may strip invalid keys / coerce types).
    const canonical = valuesRecordSchema.parse(toSave);
    return { manual_values: canonical, field_formulas: savedFormulas };
  },
};

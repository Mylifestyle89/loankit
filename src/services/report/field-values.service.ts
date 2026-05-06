/**
 * Field-values service — auto/manual field values & formulas.
 *
 * Phase 6: scope is master/loan-driven. Caller supplies `loanId` (preferred)
 * or legacy `mappingInstanceId` (translated). Field catalog comes from
 * `MasterTemplate.fieldCatalogJson` when a master is resolved; otherwise
 * the legacy global `state.field_catalog`. Manual values + formulas live
 * exclusively in DB (valuesService for dossier values, MasterTemplate.formulasJson
 * for formulas). Per-instance FS overrides are gone.
 */
import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import { enrichContextWithLabels } from "@/core/use-cases/formula-processor";
import { docxEngine } from "@/lib/docx-engine";
import { prisma } from "@/lib/prisma";
import { evaluateFieldFormula } from "@/lib/report/field-calc";
import { loadState } from "@/lib/report/fs-store";
import { runBuildAndValidate } from "@/lib/report/pipeline-client";
import { valuesRecordSchema, type ValuesRecord } from "@/lib/report/values-schema";
import { parseFieldCatalogJson } from "./_shared";
import {
  masterAndLoanFromMappingInstance,
  masterIdFromLoan,
} from "./master-source";
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

type ResolvedScope = {
  fieldCatalog: Awaited<ReturnType<typeof loadState>>["field_catalog"];
  loanId: string | null;
  masterTemplateId: string | null;
};

async function resolveScope(input: {
  loanId?: string;
  masterTemplateId?: string;
  mappingInstanceId?: string;
}): Promise<ResolvedScope> {
  let loanId: string | null = input.loanId ?? null;
  let masterTemplateId: string | null = input.masterTemplateId ?? null;

  if (input.mappingInstanceId && (!loanId || !masterTemplateId)) {
    const t = await masterAndLoanFromMappingInstance(input.mappingInstanceId);
    loanId = loanId ?? t.loanId;
    masterTemplateId = masterTemplateId ?? t.masterTemplateId;
  }

  if (!masterTemplateId && loanId) {
    masterTemplateId = await masterIdFromLoan(loanId);
  }

  if (!masterTemplateId) {
    const state = await loadState();
    return { fieldCatalog: state.field_catalog, loanId, masterTemplateId: null };
  }

  const master = await prisma.masterTemplate.findUnique({
    where: { id: masterTemplateId },
    select: { fieldCatalogJson: true },
  });
  if (!master) {
    throw new ValidationError(`Master template ${masterTemplateId} not found.`);
  }
  return {
    fieldCatalog: parseFieldCatalogJson(master.fieldCatalogJson),
    loanId,
    masterTemplateId,
  };
}

async function readFormulasForMaster(masterTemplateId: string | null): Promise<Record<string, string>> {
  if (!masterTemplateId) return {};
  try {
    return await masterTemplateService.getFormulasForTemplate(masterTemplateId);
  } catch (e) {
    if (e instanceof NotFoundError) return {};
    throw e;
  }
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
  async getFieldValues(params?: {
    loanId?: string;
    masterTemplateId?: string;
    mappingInstanceId?: string;
  }) {
    const scope = await resolveScope(params ?? {});
    const [flatValues, manualValues, fieldFormulas] = await Promise.all([
      loadFlatDraftWithBuildFallback(),
      readDossierValues(scope.loanId),
      readFormulasForMaster(scope.masterTemplateId),
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
    loanId?: string;
    masterTemplateId?: string;
    mappingInstanceId?: string;
  }) {
    if (!input.manualValues || typeof input.manualValues !== "object") {
      throw new ValidationError("manual_values is required.");
    }

    const scope = await resolveScope({
      loanId: input.loanId,
      masterTemplateId: input.masterTemplateId,
      mappingInstanceId: input.mappingInstanceId,
    });

    if (!scope.loanId) {
      throw new ValidationError(
        "Cannot save manual values without a linked loan. Provide loan_id (or relink the mapping instance).",
      );
    }

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

    const writeFormulas = async (): Promise<Record<string, string>> => {
      if (!input.fieldFormulas || typeof input.fieldFormulas !== "object") return {};
      if (!scope.masterTemplateId) {
        // No master to write to; silently skip — values still persist on the loan.
        console.warn(`${LOG_PREFIX} loan ${scope.loanId} has no master template, formulas not persisted.`);
        return input.fieldFormulas;
      }
      await masterTemplateService.setFormulasForTemplate(scope.masterTemplateId, input.fieldFormulas);
      return input.fieldFormulas;
    };

    const [, savedFormulas] = await Promise.all([
      valuesService.saveDossierValues(scope.loanId, toSave),
      writeFormulas(),
    ]);
    const canonical = valuesRecordSchema.parse(toSave);
    return { manual_values: canonical, field_formulas: savedFormulas };
  },
};

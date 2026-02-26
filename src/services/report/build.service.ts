/**
 * Build service — build, validate, export DOCX reports.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { ValidationError } from "@/core/errors/app-error";
import { groupDataByField } from "@/core/use-cases/grouping-engine";
import { validateReportPayload } from "@/core/use-cases/report-validation";
import { docxEngine } from "@/lib/docx-engine";
import { REPORT_BUILD_META_FILE, REPORT_MERGED_FLAT_FILE } from "@/lib/report/constants";
import { getActiveTemplateProfile, loadState } from "@/lib/report/fs-store";
import { loadManualValues, mergeFlatWithManualValues } from "@/lib/report/manual-values";
import { logRun, runBuildAndValidate } from "@/lib/report/pipeline-client";

import {
  type BuildFreshness,
  type BuildMeta,
  type MappingSource,
  mapDocxError,
  resolveParentFromGroupedRecord,
  sanitizeFilePart,
  sourceIdFromResolved,
} from "./_shared";
import { resolveMappingSource } from "./_migration-internals";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function readBuildMeta(): Promise<BuildMeta | null> {
  try {
    const raw = await fs.readFile(REPORT_BUILD_META_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<BuildMeta>;
    if (
      typeof parsed.built_at === "string" &&
      (parsed.mapping_source_mode === "instance" || parsed.mapping_source_mode === "legacy") &&
      typeof parsed.mapping_source_id === "string" &&
      typeof parsed.mapping_source_updated_at === "string" &&
      typeof parsed.template_profile_id === "string"
    ) {
      return parsed as BuildMeta;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeBuildMeta(params: {
  source: MappingSource;
  templateProfileId: string;
}): Promise<BuildMeta> {
  const next: BuildMeta = {
    built_at: new Date().toISOString(),
    mapping_source_mode: params.source.mode,
    mapping_source_id: params.source.mode === "instance" ? params.source.instanceId : params.source.versionId,
    mapping_source_updated_at: params.source.mappingUpdatedAt,
    template_profile_id: params.templateProfileId,
  };
  await fs.writeFile(REPORT_BUILD_META_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

async function hasFlatDraftFile(): Promise<boolean> {
  try {
    await fs.access(path.join(process.cwd(), "report_assets", "report_draft_flat.json"));
    return true;
  } catch {
    return false;
  }
}

async function getBuildFreshnessStatus(mappingInstanceId?: string): Promise<BuildFreshness> {
  const [state, source, buildMeta, hasFlatDraft] = await Promise.all([
    loadState(),
    resolveMappingSource(mappingInstanceId),
    readBuildMeta(),
    hasFlatDraftFile(),
  ]);
  const reasons: string[] = [];

  if (!hasFlatDraft) reasons.push("FLAT_DRAFT_MISSING");
  if (!buildMeta) reasons.push("NO_BUILD_META");
  if (buildMeta) {
    if (buildMeta.mapping_source_mode !== source.mode) reasons.push("MAPPING_SOURCE_MODE_CHANGED");
    const sourceId = source.mode === "instance" ? source.instanceId : source.versionId;
    if (buildMeta.mapping_source_id !== sourceId) reasons.push("MAPPING_SOURCE_CHANGED");
    if (buildMeta.mapping_source_updated_at !== source.mappingUpdatedAt) reasons.push("MAPPING_UPDATED");
    if ((buildMeta.template_profile_id || "unknown") !== (state.active_template_id || "unknown")) {
      reasons.push("TEMPLATE_CHANGED");
    }
    const builtAtMs = Date.parse(buildMeta.built_at);
    const mappingUpdatedMs = Date.parse(source.mappingUpdatedAt);
    if (Number.isFinite(builtAtMs) && Number.isFinite(mappingUpdatedMs) && builtAtMs < mappingUpdatedMs) {
      reasons.push("MAPPING_NEWER_THAN_BUILD");
    }
  }

  return {
    is_stale: reasons.length > 0,
    reasons,
    has_flat_draft: hasFlatDraft,
    current_mapping_source_mode: source.mode,
    current_mapping_source_id: source.mode === "instance" ? source.instanceId : source.versionId,
    current_mapping_updated_at: source.mappingUpdatedAt,
    last_build_at: buildMeta?.built_at,
  };
}

// ---------------------------------------------------------------------------
// Build Service
// ---------------------------------------------------------------------------

export const buildService = {
  async runBuildAndLog() {
    const start = Date.now();
    const state = await loadState();
    const source = await resolveMappingSource();
    const result = await runBuildAndValidate();
    await writeBuildMeta({
      source,
      templateProfileId: state.active_template_id ?? "unknown",
    });
    const durationMs = Date.now() - start;
    await logRun({
      resultSummary: {
        step: "build_validate",
        validation: result.validation,
      },
      outputPaths: [
        "report_assets/report_draft.json",
        "report_assets/report_draft_flat.json",
        "report_assets/validation_report.json",
      ],
      durationMs,
    });
    return { durationMs, command: result.command, validation: result.validation };
  },

  async getBuildFreshness(params?: { mappingInstanceId?: string }) {
    return getBuildFreshnessStatus(params?.mappingInstanceId);
  },

  async runReportExport(input: { outputPath?: string; reportPath?: string; templatePath?: string; mappingInstanceId?: string }) {
    const start = Date.now();
    const state = await loadState();
    const source = await resolveMappingSource(input.mappingInstanceId);
    const activeTemplate = await getActiveTemplateProfile(state);

    const outputPath = input.outputPath ?? "report_assets/report_preview.docx";
    const reportPath = input.reportPath ?? "report_assets/template_export_report.json";
    const templatePath = input.templatePath ?? activeTemplate.docx_path;
    const stale = await getBuildFreshnessStatus(input.mappingInstanceId);
    let autoBuildTriggered = false;
    if (stale.is_stale) {
      await runBuildAndValidate();
      await writeBuildMeta({
        source,
        templateProfileId: state.active_template_id ?? "unknown",
      });
      autoBuildTriggered = true;
    }
    const baseFlat = await docxEngine.readJson<Record<string, unknown>>("report_assets/report_draft_flat.json");
    const aliasMap = await docxEngine.readJson<Record<string, unknown>>(source.aliasPath);
    const manualValues = await loadManualValues();
    const mergedFlat = mergeFlatWithManualValues(baseFlat, manualValues);
    await docxEngine.writeJson(REPORT_MERGED_FLAT_FILE, mergedFlat);

    try {
      await docxEngine.generateDocx(templatePath, { flat: mergedFlat, aliasMap }, outputPath);
    } catch (error) {
      mapDocxError(error);
    }
    const report = {
      template_docx: templatePath,
      output_docx: outputPath,
      engine: "docxtemplater (engine)",
    };
    await docxEngine.writeJson(reportPath, report);

    const durationMs = Date.now() - start;
    await logRun({
      resultSummary: {
        step: "export_docx",
        auto_build_triggered: autoBuildTriggered,
        stale_reasons: stale.reasons,
        mapping_source_id: sourceIdFromResolved(source),
        report,
      },
      outputPaths: [outputPath, reportPath],
      durationMs,
    });

    return {
      duration_ms: durationMs,
      output_path: outputPath,
      report_path: reportPath,
      report,
      auto_build_triggered: autoBuildTriggered,
      stale_reasons: stale.reasons,
      command: { stdout: "Rendered via DOCX engine.", stderr: "", exitCode: 0 },
    };
  },

  async processBankReportExport(input?: {
    reportPath?: string;
    templatePath?: string;
    outputDir?: string;
    groupKey?: string;
    repeatKey?: string;
    customerNameKey?: string;
    mappingInstanceId?: string;
  }) {
    const start = Date.now();
    const state = await loadState();
    const source = await resolveMappingSource(input?.mappingInstanceId);
    const activeTemplate = await getActiveTemplateProfile(state);

    const templatePath = input?.templatePath ?? activeTemplate.docx_path;
    const reportPath = input?.reportPath ?? "report_assets/template_export_report_bank.json";
    const outputDir = input?.outputDir ?? "report_assets/exports/bank-rate-notices";
    const groupKey = input?.groupKey?.trim() || "HĐTD";
    const repeatKey = input?.repeatKey?.trim() || "items";
    const customerNameKey = input?.customerNameKey?.trim() || "TÊN KH";

    const stale = await getBuildFreshnessStatus(input?.mappingInstanceId);
    let autoBuildTriggered = false;
    if (stale.is_stale) {
      await runBuildAndValidate();
      await writeBuildMeta({
        source,
        templateProfileId: state.active_template_id ?? "unknown",
      });
      autoBuildTriggered = true;
    }
    const [baseFlat, aliasMapRaw, manualValues] = await Promise.all([
      docxEngine.readJson<Record<string, unknown>>("report_assets/report_draft_flat.json"),
      docxEngine.readJson<Record<string, unknown>>(source.aliasPath),
      loadManualValues(),
    ]);
    const aliasMap = aliasMapRaw as Record<string, unknown>;
    const mergedFlat = mergeFlatWithManualValues(baseFlat, manualValues);
    await docxEngine.writeJson(REPORT_MERGED_FLAT_FILE, mergedFlat);

    const rowsRaw = mergedFlat[repeatKey];
    if (!Array.isArray(rowsRaw)) {
      throw new ValidationError(`Không tìm thấy mảng dữ liệu '${repeatKey}' trong report_draft_flat.json.`);
    }
    const rows = rowsRaw.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object" && !Array.isArray(row)));
    if (rows.length === 0) {
      throw new ValidationError(`Mảng '${repeatKey}' không có dòng dữ liệu hợp lệ.`);
    }

    const groupedRecords = groupDataByField(rows, groupKey, repeatKey) as Array<Record<string, unknown>>;
    if (groupedRecords.length === 0) {
      throw new ValidationError(`Không thể gom nhóm theo khóa '${groupKey}'.`);
    }

    const outputPaths: string[] = [];
    const renderErrors: Array<{ file: string; error: string }> = [];
    const CONCURRENCY_LIMIT = 5;
    for (let i = 0; i < groupedRecords.length; i += CONCURRENCY_LIMIT) {
      const batch = groupedRecords.slice(i, i + CONCURRENCY_LIMIT);
      const results = await Promise.allSettled(batch.map(async (groupedRecord) => {
        const payload = resolveParentFromGroupedRecord(groupedRecord, repeatKey);
        const contractNo = sanitizeFilePart(payload[groupKey], "unknown-contract");
        const customerName = sanitizeFilePart(payload[customerNameKey], "unknown-customer");
        const outputPath = path.posix.join(outputDir, `${customerName}__${contractNo}.docx`);
        await docxEngine.generateDocx(
          templatePath,
          { flat: { ...mergedFlat, ...payload }, aliasMap },
          outputPath,
        );
        return outputPath;
      }));
      for (const result of results) {
        if (result.status === "fulfilled") {
          outputPaths.push(result.value);
        } else {
          renderErrors.push({ file: `batch-${i}`, error: String(result.reason) });
        }
      }
    }

    const report = {
      mode: "bank_grouped_export",
      template_docx: templatePath,
      output_dir: outputDir,
      total_files: outputPaths.length,
      group_key: groupKey,
      repeat_key: repeatKey,
      outputs: outputPaths,
    };
    await docxEngine.writeJson(reportPath, report);

    const durationMs = Date.now() - start;
    await logRun({
      resultSummary: {
        step: "export_docx_bank_grouped",
        auto_build_triggered: autoBuildTriggered,
        stale_reasons: stale.reasons,
        report,
      },
      outputPaths: [...outputPaths, reportPath],
      durationMs,
    });

    return {
      duration_ms: durationMs,
      output_dir: outputDir,
      output_paths: outputPaths,
      report_path: reportPath,
      report,
      auto_build_triggered: autoBuildTriggered,
      stale_reasons: stale.reasons,
      render_errors: renderErrors,
      command: { stdout: "Rendered grouped bank DOCX via DOCX engine.", stderr: "", exitCode: 0 },
    };
  },

  async validateReport(input: { runBuild?: boolean; mappingInstanceId?: string }) {
    const state = await loadState();
    const activeTemplate = await getActiveTemplateProfile(state);
    const source = await resolveMappingSource(input.mappingInstanceId);

    if (input.runBuild) {
      const result = await runBuildAndValidate();
      await writeBuildMeta({
        source,
        templateProfileId: state.active_template_id ?? activeTemplate.id,
      });
      const final = validateReportPayload({
        validation: result.validation,
        templatePath: activeTemplate.docx_path,
        aliasPath: source.aliasPath,
        source: "pipeline",
      });
      return { source: "pipeline", validation: final };
    }

    const parsed = await docxEngine.readJson<unknown>("report_assets/validation_report.json");
    const final = validateReportPayload({
      validation: parsed,
      templatePath: activeTemplate.docx_path,
      aliasPath: source.aliasPath,
      source: "cached",
    });
    return { source: "cached", validation: final };
  },
};

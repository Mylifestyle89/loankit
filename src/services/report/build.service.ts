/**
 * Build service — build, validate, export DOCX reports.
 * Sub-module: build-service-bank-export.ts (grouped bank DOCX export).
 */
import { validateReportPayload } from "@/core/use-cases/report-validation";
import { docxEngine } from "@/lib/docx-engine";
import { REPORT_MERGED_FLAT_FILE } from "@/lib/report/constants";
import { getActiveTemplateProfile, loadState } from "@/lib/report/fs-store";
import { loadManualValues, mergeFlatWithManualValues } from "@/lib/report/manual-values";
import { logRun, runBuildAndValidate } from "@/lib/report/pipeline-client";

import { mapDocxError, sourceIdFromResolved } from "./_shared";
import { resolveMappingSource } from "./_migration-internals";
import { safeWriteJson, writeBuildMeta } from "./build-service-helpers";
import { getBuildFreshnessStatus } from "./build-service-freshness";
import { addLabelViAliases, produceMergedFlat } from "./build-service-data-transform";
import { processBankReportExport } from "./build-service-bank-export";

export { processBankReportExport } from "./build-service-bank-export";

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

    // Overlay manual values onto fresh pipeline output so repeater data is preserved
    await produceMergedFlat(state.field_catalog);

    const durationMs = Date.now() - start;
    await logRun({
      resultSummary: { step: "build_validate", validation: result.validation },
      outputPaths: [
        "report_assets/generated/report_draft.json",
        "report_assets/generated/report_draft_flat.json",
        "report_assets/generated/validation_report.json",
      ],
      durationMs,
    });
    return { durationMs, command: result.command, validation: result.validation };
  },

  async getBuildFreshness(params?: { mappingInstanceId?: string }) {
    return getBuildFreshnessStatus(params?.mappingInstanceId);
  },

  async runReportExport(input: {
    outputPath?: string;
    reportPath?: string;
    templatePath?: string;
    mappingInstanceId?: string;
  }) {
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
      await writeBuildMeta({ source, templateProfileId: state.active_template_id ?? "unknown" });
      autoBuildTriggered = true;
    }

    const baseFlat = await docxEngine.readJson<Record<string, unknown>>(
      "report_assets/generated/report_draft_flat.json",
    );
    const aliasMap = await docxEngine.readJson<Record<string, unknown>>(source.aliasPath);
    const manualValues = await loadManualValues();
    const mergedFlat = mergeFlatWithManualValues(baseFlat, manualValues);
    addLabelViAliases(mergedFlat, state.field_catalog);
    await safeWriteJson(REPORT_MERGED_FLAT_FILE, mergedFlat);

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
    await safeWriteJson(reportPath, report);

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

  async processBankReportExport(
    input?: Parameters<typeof processBankReportExport>[0],
  ) {
    return processBankReportExport(input);
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
      await produceMergedFlat(state.field_catalog);
      const final = validateReportPayload({
        validation: result.validation,
        templatePath: activeTemplate.docx_path,
        aliasPath: source.aliasPath,
        source: "pipeline",
      });
      return { source: "pipeline", validation: final };
    }

    const parsed = await docxEngine.readJson<unknown>(
      "report_assets/generated/validation_report.json",
    );
    const final = validateReportPayload({
      validation: parsed,
      templatePath: activeTemplate.docx_path,
      aliasPath: source.aliasPath,
      source: "cached",
    });
    return { source: "cached", validation: final };
  },
};

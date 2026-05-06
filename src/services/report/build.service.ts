/**
 * Build service — build, validate, export DOCX reports.
 * Sub-module: build-service-bank-export.ts (grouped bank DOCX export).
 *
 * Scope is master-template-aware. Methods accept `loanId` (preferred) or
 * `mappingInstanceId` (back-compat — translated to loan internally). Unscoped
 * calls use the legacy FS active mapping version.
 */
import { validateReportPayload } from "@/core/use-cases/report-validation";
import { docxEngine } from "@/lib/docx-engine";
import { REPORT_MERGED_FLAT_FILE } from "@/lib/report/constants";
import { getActiveTemplateProfile, loadState } from "@/lib/report/fs-store";
import { logRun, runBuildAndValidate } from "@/lib/report/pipeline-client";

import { mapDocxError } from "./_shared";
import {
  buildSourceId,
  loadAliasMapFromBuildSource,
  loanIdFromBuildSource,
  resolveBuildSource,
  type BuildScope,
} from "./build-source";
import { safeWriteJson, writeBuildMeta } from "./build-service-helpers";
import { getBuildFreshnessFromSource, getBuildFreshnessStatus } from "./build-service-freshness";
import { addLabelViAliases, produceMergedFlat } from "./build-service-data-transform";
import { processBankReportExport } from "./build-service-bank-export";
import { resolveValuesForLoan } from "./values-resolver";

export { processBankReportExport } from "./build-service-bank-export";

// ---------------------------------------------------------------------------
// Build Service
// ---------------------------------------------------------------------------

export const buildService = {
  async runBuildAndLog() {
    const start = Date.now();
    const state = await loadState();
    const source = await resolveBuildSource();
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

  async getBuildFreshness(params?: BuildScope) {
    return getBuildFreshnessStatus(params ?? {});
  },

  async runReportExport(input: {
    outputPath?: string;
    reportPath?: string;
    templatePath?: string;
    loanId?: string;
  }) {
    const start = Date.now();
    const state = await loadState();
    const source = await resolveBuildSource({
      loanId: input.loanId,
    });
    const activeTemplate = await getActiveTemplateProfile(state);
    const resolvedLoanId = loanIdFromBuildSource(source);

    const outputPath = input.outputPath ?? "report_assets/report_preview.docx";
    const reportPath = input.reportPath ?? "report_assets/template_export_report.json";
    const templatePath = input.templatePath ?? activeTemplate.docx_path;
    const stale = await getBuildFreshnessFromSource(source);
    let autoBuildTriggered = false;
    if (stale.is_stale) {
      await runBuildAndValidate();
      await writeBuildMeta({ source, templateProfileId: state.active_template_id ?? "unknown" });
      autoBuildTriggered = true;
    }

    const baseFlat = await docxEngine.readJson<Record<string, unknown>>(
      "report_assets/generated/report_draft_flat.json",
    );
    const aliasMap = await loadAliasMapFromBuildSource(source);
    const manualValues = await resolveValuesForLoan(resolvedLoanId);
    const mergedFlat = { ...baseFlat, ...manualValues };
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
        mapping_source_id: buildSourceId(source),
        loan_id: resolvedLoanId,
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

  async validateReport(input: { runBuild?: boolean; loanId?: string }) {
    const state = await loadState();
    const activeTemplate = await getActiveTemplateProfile(state);
    const source = await resolveBuildSource({
      loanId: input.loanId,
    });
    const aliasPathHint = source.mode === "legacy" ? source.aliasPath : `master:${source.masterTemplateId}`;

    if (input.runBuild) {
      const result = await runBuildAndValidate();
      await writeBuildMeta({
        source,
        templateProfileId: state.active_template_id ?? activeTemplate.id,
      });
      await produceMergedFlat(state.field_catalog, loanIdFromBuildSource(source));
      const final = validateReportPayload({
        validation: result.validation,
        templatePath: activeTemplate.docx_path,
        aliasPath: aliasPathHint,
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
      aliasPath: aliasPathHint,
      source: "cached",
    });
    return { source: "cached", validation: final };
  },
};

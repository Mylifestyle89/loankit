/**
 * build-service-bank-export.ts
 * Grouped bank DOCX export logic — extracted from build.service.ts.
 * Renders one DOCX per contract group from mergedFlat data.
 */
import path from "node:path";

import { ValidationError } from "@/core/errors/app-error";
import { groupDataByField } from "@/core/use-cases/grouping-engine";
import { docxEngine } from "@/lib/docx-engine";
import { REPORT_MERGED_FLAT_FILE } from "@/lib/report/constants";
import { getActiveTemplateProfile, loadState } from "@/lib/report/fs-store";
import { logRun, runBuildAndValidate } from "@/lib/report/pipeline-client";

import { resolveParentFromGroupedRecord, sanitizeFilePart } from "./_shared";
import {
  loadAliasMapFromBuildSource,
  loanIdFromBuildSource,
  resolveBuildSource,
} from "./build-source";
import { safeWriteJson, writeBuildMeta } from "./build-service-helpers";
import { getBuildFreshnessFromSource } from "./build-service-freshness";
import { addLabelViAliases } from "./build-service-data-transform";
import { resolveValuesForLoan } from "./values-resolver";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BankExportInput = {
  reportPath?: string;
  templatePath?: string;
  outputDir?: string;
  groupKey?: string;
  repeatKey?: string;
  customerNameKey?: string;
  loanId?: string;
  mappingInstanceId?: string;
};

export type BankExportResult = {
  duration_ms: number;
  output_dir: string;
  output_paths: string[];
  report_path: string;
  report: object;
  auto_build_triggered: boolean;
  stale_reasons: string[];
  render_errors: Array<{ file: string; error: string }>;
  command: { stdout: string; stderr: string; exitCode: number };
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function processBankReportExport(input?: BankExportInput): Promise<BankExportResult> {
  const start = Date.now();
  const state = await loadState();
  const source = await resolveBuildSource({
    loanId: input?.loanId,
    mappingInstanceId: input?.mappingInstanceId,
  });
  const activeTemplate = await getActiveTemplateProfile(state);

  const templatePath = input?.templatePath ?? activeTemplate.docx_path;
  const reportPath = input?.reportPath ?? "report_assets/generated/template_export_report_bank.json";
  const outputDir = input?.outputDir ?? "report_assets/exports/bank-rate-notices";
  const groupKey = input?.groupKey?.trim() || "HĐTD";
  const repeatKey = input?.repeatKey?.trim() || "items";
  const customerNameKey = input?.customerNameKey?.trim() || "TÊN KH";

  const stale = await getBuildFreshnessFromSource(source);
  let autoBuildTriggered = false;
  if (stale.is_stale) {
    await runBuildAndValidate();
    await writeBuildMeta({ source, templateProfileId: state.active_template_id ?? "unknown" });
    autoBuildTriggered = true;
  }

  const resolvedLoanId = loanIdFromBuildSource(source);
  const [baseFlat, aliasMapRaw, manualValues] = await Promise.all([
    docxEngine.readJson<Record<string, unknown>>("report_assets/generated/report_draft_flat.json"),
    loadAliasMapFromBuildSource(source),
    resolveValuesForLoan(resolvedLoanId),
  ]);
  const aliasMap = aliasMapRaw as Record<string, unknown>;
  const mergedFlat = { ...baseFlat, ...manualValues };
  addLabelViAliases(mergedFlat, state.field_catalog);
  await safeWriteJson(REPORT_MERGED_FLAT_FILE, mergedFlat);

  const rowsRaw = mergedFlat[repeatKey];
  if (!Array.isArray(rowsRaw)) {
    throw new ValidationError(`Không tìm thấy mảng dữ liệu '${repeatKey}' trong report_draft_flat.json.`);
  }
  const rows = rowsRaw.filter(
    (row): row is Record<string, unknown> =>
      Boolean(row && typeof row === "object" && !Array.isArray(row)),
  );
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
    const results = await Promise.allSettled(
      batch.map(async (groupedRecord) => {
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
      }),
    );
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
  await safeWriteJson(reportPath, report);

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
}

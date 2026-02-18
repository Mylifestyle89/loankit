import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { REPORT_MERGED_FLAT_FILE } from "@/lib/report/constants";
import { getActiveMappingVersion, getActiveTemplateProfile, loadState } from "@/lib/report/fs-store";
import { loadManualValues, mergeFlatWithManualValues } from "@/lib/report/manual-values";
import { logRun, runExport } from "@/lib/report/pipeline-client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const body = (await req.json().catch(() => ({}))) as {
      output_path?: string;
      report_path?: string;
      template_path?: string;
    };
    const state = await loadState();
    const activeVersion = await getActiveMappingVersion(state);
    const activeTemplate = await getActiveTemplateProfile(state);

    const outputPath = body.output_path ?? "report_assets/report_preview.docx";
    const reportPath = body.report_path ?? "report_assets/template_export_report.json";
    const templatePath = body.template_path ?? activeTemplate.docx_path;
    const baseFlatPath = path.join(process.cwd(), "report_assets/report_draft_flat.json");
    const baseFlat = JSON.parse(await fs.readFile(baseFlatPath, "utf-8")) as Record<string, unknown>;
    const manualValues = await loadManualValues();
    const mergedFlat = mergeFlatWithManualValues(baseFlat, manualValues);
    await fs.writeFile(REPORT_MERGED_FLAT_FILE, JSON.stringify(mergedFlat, null, 2), "utf-8");

    const result = await runExport({
      templatePath,
      aliasPath: activeVersion.alias_json_path,
      flatJsonPath: "report_assets/config/merged_report_draft_flat.json",
      outputPath,
      reportPath,
    });

    const durationMs = Date.now() - start;
    await logRun({
      resultSummary: {
        step: "export_docx",
        report: result.exportReport,
      },
      outputPaths: [outputPath, reportPath],
      durationMs,
    });

    return NextResponse.json({
      ok: true,
      duration_ms: durationMs,
      output_path: outputPath,
      report_path: reportPath,
      report: result.exportReport,
      command: result.command,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Export failed." },
      { status: 500 },
    );
  }
}

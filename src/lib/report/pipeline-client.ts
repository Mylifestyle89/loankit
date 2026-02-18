import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import { loadState, appendRunLog } from "@/lib/report/fs-store";

type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

async function runPythonScript(script: string, args: string[]): Promise<CommandResult> {
  return await new Promise((resolve, reject) => {
    const child = spawn("python", [script, ...args], { cwd: process.cwd() });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? 1 });
    });
  });
}

async function readJson(relPath: string): Promise<unknown> {
  const absolute = path.join(process.cwd(), relPath);
  const raw = await fs.readFile(absolute, "utf-8");
  return JSON.parse(raw);
}

export async function runBuildAndValidate(): Promise<{
  command: CommandResult;
  reportDraft: unknown;
  reportDraftFlat: unknown;
  validation: unknown;
}> {
  const command = await runPythonScript("run_pipeline.py", []);
  if (command.exitCode !== 0) {
    throw new Error(command.stderr || command.stdout || "run_pipeline.py failed");
  }
  const reportDraft = await readJson("report_assets/report_draft.json");
  const reportDraftFlat = await readJson("report_assets/report_draft_flat.json");
  const validation = await readJson("report_assets/validation_report.json");
  return { command, reportDraft, reportDraftFlat, validation };
}

export async function runExport(params: {
  templatePath?: string;
  aliasPath?: string;
  flatJsonPath?: string;
  outputPath?: string;
  reportPath?: string;
}): Promise<{ command: CommandResult; exportReport: unknown }> {
  const args = [
    "--template",
    params.templatePath ?? "report_assets/2268_no_prefix_placeholders.docx",
    "--flat-json",
    params.flatJsonPath ?? "report_assets/report_draft_flat.json",
    "--alias-map",
    params.aliasPath ?? "report_assets/placeholder_alias_2268.json",
    "--output",
    params.outputPath ?? "report_assets/report_preview.docx",
    "--report",
    params.reportPath ?? "report_assets/template_export_report.json",
  ];
  const command = await runPythonScript("export_template_stub.py", args);
  if (command.exitCode !== 0) {
    throw new Error(command.stderr || command.stdout || "export_template_stub.py failed");
  }
  const exportReport = await readJson(params.reportPath ?? "report_assets/template_export_report.json");
  return { command, exportReport };
}

export async function logRun(params: {
  resultSummary: Record<string, unknown>;
  outputPaths: string[];
  durationMs: number;
}): Promise<void> {
  const state = await loadState();
  await appendRunLog({
    run_id: `run-${Date.now()}`,
    mapping_version_id: state.active_mapping_version_id ?? "unknown",
    template_profile_id: state.active_template_id ?? "unknown",
    result_summary: params.resultSummary,
    output_paths: params.outputPaths,
    duration_ms: params.durationMs,
    created_at: new Date().toISOString(),
  });
}

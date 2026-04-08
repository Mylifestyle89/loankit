import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import {
  mapRowsWithSuggestion,
  normalizeDynamicRows,
  pickBestCustomerNameKey,
  resolveRootKey,
  type DynamicRow,
  type RootKeyCandidate,
} from "@/core/use-cases/universal-auto-process-engine";
import { groupDataByField } from "@/core/use-cases/grouping-engine";
import { docxEngine } from "@/lib/docx-engine";
import { parseDocxPlaceholderInventory } from "@/lib/report/template-parser";
import { aiMappingService } from "@/services/ai-mapping.service";
import {
  ensureExists,
  getFileExt,
  makeJobId,
  mapDocxError,
  normalizeRelAssetPath,
  nowIso,
  parseMarkdownRows,
  resolveAssetPath,
  resolveParentFromGroupedRecord,
  sanitizePart,
} from "@/services/auto-process-helpers";

type JobPhase = "idle" | "analyzing" | "ready" | "running" | "completed" | "failed";

type AutoProcessProgress = {
  current: number;
  total: number;
  percent: number;
  currentLabel: string;
};

type AutoProcessJob = {
  id: string;
  createdAt: string;
  updatedAt: string;
  phase: JobPhase;
  message: string;
  excelPath: string;
  templatePath: string;
  jobType: string;
  headers: string[];
  placeholders: string[];
  rows: DynamicRow[];
  mapping: Record<string, string>;
  rootCandidates: RootKeyCandidate[];
  suggestedRootKey: string;
  repeatKey: string;
  customerNameKey?: string;
  outputDir?: string;
  outputPaths: string[];
  warnings: string[];
  error?: string;
  progress: AutoProcessProgress;
};

type StartInput = {
  excelPath: string;
  templatePath: string;
  jobType?: string;
};

type RunInput = {
  jobId: string;
  rootKey?: string;
};

// Preserve jobs across Next HMR reloads (module re-evaluation clears local state).
// Attaching to globalThis keeps Map alive between dev saves so /start → /run flow
// doesn't lose the job id when editing this file.
const globalStore = globalThis as unknown as { __autoProcessJobs?: Map<string, AutoProcessJob> };
const jobs: Map<string, AutoProcessJob> = globalStore.__autoProcessJobs ?? new Map<string, AutoProcessJob>();
globalStore.__autoProcessJobs = jobs;

async function readTabularRows(dataPath: string): Promise<{ headers: string[]; rows: DynamicRow[] }> {
  const abs = resolveAssetPath(dataPath);
  const ext = getFileExt(dataPath);
  let rows: Record<string, unknown>[] = [];

  if (ext === ".json") {
    const raw = await fs.readFile(abs, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new ValidationError("JSON phải là mảng object.");
    rows = parsed.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as Record<string, unknown>[];
  } else if (ext === ".md") {
    const raw = await fs.readFile(abs, "utf-8");
    rows = parseMarkdownRows(raw);
  } else {
    const buffer = await fs.readFile(abs);
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new ValidationError("File dữ liệu không có sheet hợp lệ.");
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  }

  const normalizedRows = normalizeDynamicRows(rows);
  const headers = [...new Set(normalizedRows.flatMap((row) => Object.keys(row).map((k) => String(k).trim()).filter(Boolean)))];
  return { headers, rows: normalizedRows };
}

function toJobSummary(job: AutoProcessJob) {
  return {
    job_id: job.id,
    phase: job.phase,
    message: job.message,
    excel_path: job.excelPath,
    template_path: job.templatePath,
    job_type: job.jobType,
    headers: job.headers,
    placeholders: job.placeholders,
    mapping: job.mapping,
    suggested_root_key: job.suggestedRootKey,
    root_candidates: job.rootCandidates,
    repeat_key: job.repeatKey,
    customer_name_key: job.customerNameKey ?? null,
    output_dir: job.outputDir ?? null,
    output_paths: job.outputPaths,
    warnings: job.warnings,
    error: job.error,
    progress: job.progress,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  };
}

async function listFilesRecursive(dirPath: string, baseRel = ""): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    const rel = baseRel ? `${baseRel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      result.push(...(await listFilesRecursive(path.join(dirPath, entry.name), rel)));
      continue;
    }
    result.push(rel.replaceAll("\\", "/"));
  }
  return result;
}

export const autoProcessService = {
  async listAssetFiles() {
    const root = path.join(process.cwd(), "report_assets");
    const files = await listFilesRecursive(root);
    const excelFiles = files.filter((f) => /\.(xlsx|xls|csv)$/i.test(f)).map((f) => `report_assets/${f}`);
    const templateFiles = files.filter((f) => /\.(docx|doc)$/i.test(f)).map((f) => `report_assets/${f}`);
    return { excelFiles, templateFiles };
  },

  async startUniversalAutoProcess(input: StartInput) {
    const excelPath = normalizeRelAssetPath(input.excelPath);
    const templatePath = normalizeRelAssetPath(input.templatePath);
    const dataExt = getFileExt(excelPath);
    if (![".xlsx", ".xls", ".csv", ".json", ".md"].includes(dataExt)) {
      throw new ValidationError("File dữ liệu chỉ hỗ trợ .csv/.xlsx/.xls/.json/.md");
    }
    const templateExt = getFileExt(templatePath);
    if (![".docx", ".doc"].includes(templateExt)) {
      throw new ValidationError("Template chỉ hỗ trợ .docx/.doc");
    }
    const jobType = sanitizePart(input.jobType ?? "Batch", "Batch");
    await ensureExists(excelPath);
    await ensureExists(templatePath);

    const id = makeJobId();
    const job: AutoProcessJob = {
      id,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      phase: "analyzing",
      message: "Đang nhận diện cấu trúc dữ liệu...",
      excelPath,
      templatePath,
      jobType,
      headers: [],
      placeholders: [],
      rows: [],
      mapping: {},
      rootCandidates: [],
      suggestedRootKey: "",
      repeatKey: "items",
      outputPaths: [],
      warnings: [],
      progress: { current: 0, total: 3, percent: 0, currentLabel: "Đang nhận diện cấu trúc dữ liệu..." },
    };
    jobs.set(id, job);

    try {
      const { headers, rows } = await readTabularRows(excelPath);
      if (rows.length === 0) throw new ValidationError("File Excel không có dòng dữ liệu hợp lệ.");
      job.headers = headers;
      job.rows = rows;
      job.progress = { current: 1, total: 3, percent: 33, currentLabel: "Đã đọc dữ liệu Excel." };

      const inventory = await parseDocxPlaceholderInventory(templatePath);
      const placeholders = inventory.placeholders.filter(Boolean);
      if (placeholders.length === 0) throw new ValidationError("Không tìm thấy placeholder trong template Word.");
      job.placeholders = placeholders;
      job.progress = { current: 2, total: 3, percent: 66, currentLabel: "Đã quét placeholder từ Word." };

      const suggestion = await aiMappingService.suggestMapping(headers, placeholders, { includeGrouping: true });
      job.mapping = suggestion.mapping;
      const resolution = resolveRootKey({
        rows,
        headers,
        aiSuggestedKey: suggestion.grouping?.groupKey,
      });
      job.rootCandidates = resolution.candidates;
      job.suggestedRootKey = resolution.rootKey;
      // Detect loop marker from placeholders: template tag [#Xxx] → repeatKey = "Xxx"
      // Fallback to "items" if no loop marker found.
      const loopMarker = placeholders.find((p) => p.startsWith("#"));
      job.repeatKey = loopMarker ? loopMarker.slice(1).trim() : "items";
      job.customerNameKey = pickBestCustomerNameKey(headers, suggestion.mapping);
      job.phase = "ready";
      job.message = `Đã tìm thấy khóa chính: ${job.suggestedRootKey}`;
      job.progress = { current: 3, total: 3, percent: 100, currentLabel: job.message };
      job.updatedAt = nowIso();
      return toJobSummary(job);
    } catch (error) {
      job.phase = "failed";
      job.error = error instanceof Error ? error.message : "Auto process failed.";
      job.message = job.error;
      job.updatedAt = nowIso();
      throw error;
    }
  },

  async runUniversalAutoProcess(input: RunInput) {
    const job = jobs.get(input.jobId);
    if (!job) throw new NotFoundError("Không tìm thấy job Auto-Process.");
    if (!(job.phase === "ready" || job.phase === "failed")) {
      throw new ValidationError("Job chưa sẵn sàng để chạy batch export.");
    }

    // Single-file mode: loop ALL rows inside one DOCX (no grouping by root key).
    // Template has [#<repeatKey>]...[/<repeatKey>] marker; entire dataset becomes that loop array.
    const mappedRows = mapRowsWithSuggestion(job.rows, job.mapping);
    // Allow user to override repeatKey via run input (root_key field is repurposed)
    const repeatKey = input.rootKey?.trim() || job.repeatKey || "items";
    job.repeatKey = repeatKey;

    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const outputDir = `report_assets/exports/${job.jobType}_${timestamp}`;
    const outputPath = path.posix.join(outputDir, `${job.jobType}_${timestamp}.docx`);
    job.outputDir = outputDir;
    job.outputPaths = [];
    job.phase = "running";
    job.error = undefined;
    job.message = `Đang gen file duy nhất chứa ${mappedRows.length} bản ghi...`;
    job.progress = {
      current: 0,
      total: 1,
      percent: 0,
      currentLabel: job.message,
    };
    job.updatedAt = nowIso();

    // Build payload: single object with all rows under repeat key + aggregate scalars from row[0]
    const firstRow = mappedRows[0] ?? {};
    const payload: Record<string, unknown> = {
      ...firstRow,
      [repeatKey]: mappedRows,
    };

    try {
      await docxEngine.generateDocx(job.templatePath, payload, outputPath);
    } catch (error) {
      mapDocxError(error);
    }
    job.outputPaths.push(outputPath);

    job.phase = "completed";
    job.message = `Hoàn tất: 1 file chứa ${mappedRows.length} bản ghi.`;
    job.progress = {
      current: 1,
      total: 1,
      percent: 100,
      currentLabel: job.message,
    };
    job.updatedAt = nowIso();
    return toJobSummary(job);
  },

  async openJobOutputFolder(jobId: string) {
    const job = jobs.get(jobId);
    if (!job) throw new NotFoundError("Không tìm thấy job Auto-Process.");
    if (!job.outputDir) throw new ValidationError("Job chưa có thư mục kết quả.");
    const result = await docxEngine.openFolder(job.outputDir);
    return { outputDir: job.outputDir, openedDir: result };
  },

  getJob(jobId: string) {
    const job = jobs.get(jobId);
    if (!job) throw new NotFoundError("Không tìm thấy job Auto-Process.");
    return toJobSummary(job);
  },
};

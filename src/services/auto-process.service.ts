import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

import { NotFoundError, SystemError, ValidationError } from "@/core/errors/app-error";
import {
  mapRowsWithSuggestion,
  normalizeDynamicRows,
  pickBestCustomerNameKey,
  resolveRootKey,
  type DynamicRow,
  type RootKeyCandidate,
} from "@/core/use-cases/universal-auto-process-engine";
import { groupDataByField } from "@/core/use-cases/grouping-engine";
import { CorruptedTemplateError, DataPlaceholderMismatchError, docxEngine, TemplateNotFoundError } from "@/lib/docx-engine";
import { parseDocxPlaceholderInventory } from "@/lib/report/template-parser";
import { aiMappingService } from "@/services/ai-mapping.service";

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

const jobs = new Map<string, AutoProcessJob>();

function normalizeRelAssetPath(relPath: string): string {
  const normalized = relPath.replaceAll("\\", "/").trim();
  if (!normalized) throw new ValidationError("Đường dẫn file không hợp lệ.");
  if (normalized.includes("..")) throw new ValidationError("Đường dẫn không an toàn.");
  return normalized;
}

function resolveAssetPath(relPath: string): string {
  return path.join(process.cwd(), normalizeRelAssetPath(relPath));
}

async function ensureExists(relPath: string): Promise<void> {
  const abs = resolveAssetPath(relPath);
  try {
    await fs.access(abs);
  } catch {
    throw new NotFoundError(`Không tìm thấy file: ${relPath}`);
  }
}

function getFileExt(relPath: string): string {
  return path.extname(relPath).toLowerCase();
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeJobId(): string {
  return `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizePart(input: unknown, fallback: string): string {
  const raw = String(input ?? "").trim();
  if (!raw) return fallback;
  return raw.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").replace(/\s+/g, " ").trim() || fallback;
}

function mapDocxError(error: unknown): never {
  if (error instanceof TemplateNotFoundError) {
    throw new ValidationError(`Không tìm thấy file template: ${error.templatePath}`);
  }
  if (error instanceof CorruptedTemplateError) {
    throw new ValidationError(`File DOCX không hợp lệ hoặc bị hỏng: ${error.templatePath}`);
  }
  if (error instanceof DataPlaceholderMismatchError) {
    throw new ValidationError(`Dữ liệu không khớp placeholder của template: ${error.templatePath}`, error.details);
  }
  throw new SystemError("DOCX engine failed unexpectedly.", error);
}

function resolveParentFromGroupedRecord(grouped: Record<string, unknown>, repeatKey: string): Record<string, unknown> {
  const parent = { ...grouped };
  const itemsRaw = parent[repeatKey];
  const items = Array.isArray(itemsRaw) ? (itemsRaw as Array<Record<string, unknown>>) : [];
  if (items.length > 0) {
    const first = items[0];
    for (const [k, v] of Object.entries(first)) {
      if (!(k in parent) || parent[k] === null || parent[k] === undefined || parent[k] === "") {
        parent[k] = v;
      }
    }
  }
  parent[repeatKey] = items;
  return parent;
}

function parseMarkdownRows(content: string): DynamicRow[] {
  const lines = content
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const tableLines = lines.filter((line) => line.includes("|"));
  if (tableLines.length < 2) return [];
  const headers = tableLines[0]
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);
  const bodyLines = tableLines.slice(1).filter((line) => !/^\|?\s*[-:| ]+\|?\s*$/.test(line));
  const rows: DynamicRow[] = [];
  for (const line of bodyLines) {
    const cells = line.split("|").map((cell) => cell.trim());
    const mapped: DynamicRow = {};
    headers.forEach((header, index) => {
      mapped[header] = cells[index] ?? "";
    });
    rows.push(mapped);
  }
  return rows;
}

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
      job.repeatKey = "items";
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

    const rootResolution = resolveRootKey({
      rows: job.rows,
      headers: job.headers,
      aiSuggestedKey: job.suggestedRootKey,
      userSelectedKey: input.rootKey,
    });
    const rootKey = rootResolution.rootKey;
    const mappedRows = mapRowsWithSuggestion(job.rows, job.mapping);
    const groupedRecords = groupDataByField(mappedRows, rootKey, job.repeatKey) as Array<Record<string, unknown>>;
    if (groupedRecords.length === 0) {
      throw new ValidationError(`Không thể gom nhóm dữ liệu theo khóa '${rootKey}'.`);
    }

    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const outputDir = `report_assets/exports/${job.jobType}_${timestamp}`;
    job.outputDir = outputDir;
    job.outputPaths = [];
    job.phase = "running";
    job.error = undefined;
    job.message = "Đang xử lý batch export...";
    job.progress = {
      current: 0,
      total: groupedRecords.length,
      percent: 0,
      currentLabel: "Bắt đầu xử lý dữ liệu...",
    };
    job.updatedAt = nowIso();

    for (let i = 0; i < groupedRecords.length; i += 1) {
      const groupedRecord = groupedRecords[i];
      const payload = resolveParentFromGroupedRecord(groupedRecord, job.repeatKey);
      const rootValue = sanitizePart(payload[rootKey], `record-${i + 1}`);
      const customerKey = job.customerNameKey ?? "customer";
      const customerName = sanitizePart(payload[customerKey], "unknown-customer");
      const outputPath = path.posix.join(outputDir, `${customerName} - ${rootValue}.docx`);

      job.progress = {
        current: i,
        total: groupedRecords.length,
        percent: Math.round((i / groupedRecords.length) * 100),
        currentLabel: `Đang xử lý hồ sơ khách hàng ${customerName}...`,
      };
      job.updatedAt = nowIso();

      try {
        await docxEngine.generateDocx(job.templatePath, { ...payload, [job.repeatKey]: payload[job.repeatKey] }, outputPath);
      } catch (error) {
        mapDocxError(error);
      }
      job.outputPaths.push(outputPath);
      job.progress = {
        current: i + 1,
        total: groupedRecords.length,
        percent: Math.round(((i + 1) / groupedRecords.length) * 100),
        currentLabel: `Đã hoàn thành ${i + 1}/${groupedRecords.length}`,
      };
      job.updatedAt = nowIso();
    }

    job.phase = "completed";
    job.message = `Hoàn tất batch export: ${job.outputPaths.length} file.`;
    job.progress = {
      current: groupedRecords.length,
      total: groupedRecords.length,
      percent: 100,
      currentLabel: "Hoàn tất xử lý.",
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

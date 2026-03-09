import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

type AliasSpec =
  | string
  | string[]
  | {
    literal?: unknown;
    from?: string | string[];
  };

export type FlatTemplateData = Record<string, unknown>;
export type AliasMap = Record<string, AliasSpec>;
export type DocxTemplateData<TFlat extends FlatTemplateData = FlatTemplateData> =
  | {
    flat: TFlat;
    aliasMap?: AliasMap;
  }
  | Record<string, unknown>;

export class TemplateNotFoundError extends Error {
  constructor(public readonly templatePath: string) {
    super(`Template not found: ${templatePath}`);
    this.name = "TemplateNotFoundError";
  }
}

export class DataPlaceholderMismatchError extends Error {
  constructor(public readonly templatePath: string, public readonly details: unknown) {
    super(`Template placeholders do not match data: ${templatePath}`);
    this.name = "DataPlaceholderMismatchError";
  }
}

export class CorruptedTemplateError extends Error {
  constructor(public readonly templatePath: string, public readonly details?: unknown) {
    super(`Template is corrupted or invalid DOCX: ${templatePath}`);
    this.name = "CorruptedTemplateError";
  }
}

function normalizeRelPath(relPath: string): string {
  return relPath.replaceAll("\\", "/");
}

function resolveWorkspacePath(relPath: string): string {
  // If relPath is already absolute, return it as-is (converted to native path separators)
  if (path.isAbsolute(relPath)) {
    return relPath;
  }
  // Otherwise, join with process.cwd()
  return path.join(process.cwd(), normalizeRelPath(relPath));
}

function toTodayLiteral(value: unknown): unknown {
  if (value === "$TODAY_DDMMYYYY") return new Date().toLocaleDateString("vi-VN");
  if (value === "$TODAY_DD") return String(new Date().getDate()).padStart(2, "0");
  if (value === "$TODAY_MM") return String(new Date().getMonth() + 1).padStart(2, "0");
  if (value === "$TODAY_YYYY") return String(new Date().getFullYear());
  return value;
}

function resolveAlias(flatData: Record<string, unknown>, aliasSpec: AliasSpec): unknown {
  if (typeof aliasSpec === "string") return flatData[aliasSpec];
  if (Array.isArray(aliasSpec)) {
    for (const key of aliasSpec) {
      if (typeof key === "string" && key in flatData) return flatData[key];
    }
    return undefined;
  }
  if (aliasSpec && typeof aliasSpec === "object") {
    if ("literal" in aliasSpec) return toTodayLiteral(aliasSpec.literal);
    if ("from" in aliasSpec) {
      const from = aliasSpec.from;
      if (typeof from === "string") return flatData[from];
      if (Array.isArray(from)) {
        for (const key of from) {
          if (typeof key === "string" && key in flatData) return flatData[key];
        }
      }
    }
  }
  return undefined;
}

function applyAliasMap(flatData: Record<string, unknown>, aliasMap: Record<string, AliasSpec>): Record<string, unknown> {
  const merged = { ...flatData };
  for (const [field, spec] of Object.entries(aliasMap)) {
    if (field in merged) continue;
    const value = resolveAlias(merged, spec);
    if (value !== undefined) merged[field] = value;
  }
  return merged;
}

function formatScalar(value: unknown): unknown {
  if (typeof value === "number" && Number.isFinite(value)) {
    let s = value.toLocaleString("en-US", { maximumFractionDigits: 6 });
    s = s.replace(/,/g, "_").replace(/\./g, ",").replace(/_/g, ".");
    return s;
  }
  return value;
}

function deepFormat(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => deepFormat(item));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepFormat(v);
    }
    return out;
  }
  return formatScalar(value);
}

// Tạm bỏ hàm unflatten vì gây lỗi map key có chứa dấu "." của docxtemplater

function toEngineData<TFlat extends FlatTemplateData>(data: DocxTemplateData<TFlat>): Record<string, unknown> {
  if (data && typeof data === "object" && "flat" in data) {
    const flat = (data.flat ?? {}) as Record<string, unknown>;
    const aliasMap = (data.aliasMap ?? {}) as Record<string, AliasSpec>;
    // Bỏ gọi hàm unflatten vì docxtemplater mặc định KHÔNG hỗ trợ phân giải nested object (nếu k dùng angularParser),
    // do đó các tag dạng thẻ [custom.abc.xyz] sẽ map trực tiếp với key "custom.abc.xyz" ở dạng flat data root.
    return deepFormat(applyAliasMap(flat, aliasMap)) as Record<string, unknown>;
  }
  if (data && typeof data === "object") {
    return deepFormat(data) as Record<string, unknown>;
  }
  return {};
}

function tsForFilename(date = new Date()): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function pruneOldBackups(dirPath: string, keepLatest = 50): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".docx"))
    .map((e) => e.name)
    .sort();
  if (files.length <= keepLatest) return;
  const toDelete = files.slice(0, files.length - keepLatest);
  await Promise.all(toDelete.map((file) => fs.unlink(path.join(dirPath, file)).catch(() => undefined)));
}

function isSafeDocxPath(relPath: string): boolean {
  const normalized = normalizeRelPath(relPath);
  if (!normalized.startsWith("report_assets/")) return false;
  if (normalized.includes("..")) return false;
  return normalized.toLowerCase().endsWith(".docx");
}

export const docxEngine = {
  async generateDocx<TFlat extends FlatTemplateData>(
    templatePath: string,
    data: DocxTemplateData<TFlat>,
    outputPath: string,
  ): Promise<void> {
    const templateAbs = resolveWorkspacePath(templatePath);
    const outputAbs = resolveWorkspacePath(outputPath);

    let templateBuffer: Buffer;
    try {
      templateBuffer = await fs.readFile(templateAbs);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
        throw new TemplateNotFoundError(templatePath);
      }
      throw error;
    }

    let zip: PizZip;
    try {
      zip = new PizZip(templateBuffer);
    } catch (error) {
      throw new CorruptedTemplateError(templatePath, error);
    }

    const renderData = toEngineData(data);
    let doc: InstanceType<typeof Docxtemplater>;
    try {
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: "[", end: "]" },
        // Return empty string for missing placeholders instead of "undefined"
        nullGetter() {
          return "";
        },
      });
    } catch (error) {
      const details =
        error && typeof error === "object" && "properties" in error
          ? (error as { properties?: { errors?: unknown } }).properties?.errors ?? error
          : error;
      console.error("[DOCX Engine] Docxtemplater init error:", details);
      throw new DataPlaceholderMismatchError(templatePath, details);
    }

    try {
      doc.render(renderData);
    } catch (error) {
      const details =
        error && typeof error === "object" && "properties" in error
          ? (error as { properties?: { errors?: unknown } }).properties?.errors ?? error
          : error;
      console.error("[DOCX Engine] Render error:", details);
      throw new DataPlaceholderMismatchError(templatePath, details);
    }

    const buffer = (doc.getZip() as PizZip).generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });
    await ensureDir(path.dirname(outputAbs));
    await fs.writeFile(outputAbs, buffer);
  },

  async writeJson(relPath: string, data: unknown): Promise<void> {
    const abs = resolveWorkspacePath(relPath);
    await ensureDir(path.dirname(abs));
    await fs.writeFile(abs, JSON.stringify(data, null, 2), "utf-8");
  },

  async readJson<T>(relPath: string): Promise<T> {
    const abs = resolveWorkspacePath(relPath);
    const raw = await fs.readFile(abs, "utf-8");
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      throw new CorruptedTemplateError(relPath, `Invalid JSON: ${(err as Error).message}`);
    }
  },

  async saveDocxWithBackup(input: { relPath: string; buffer: Buffer; mode: "backup" | "save" }) {
    const relPath = normalizeRelPath(input.relPath);
    if (!isSafeDocxPath(relPath)) throw new TemplateNotFoundError(relPath);
    if (input.buffer.byteLength < 100) throw new CorruptedTemplateError(relPath, "Payload too small");

    const absolute = resolveWorkspacePath(relPath);
    const parsed = path.parse(absolute);
    const safeBase = parsed.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const backupDir = path.join(process.cwd(), "report_assets", "backups", safeBase);
    await ensureDir(backupDir);
    const filename = `${tsForFilename()}.docx`;
    const backupAbs = path.join(backupDir, filename);
    await fs.writeFile(backupAbs, input.buffer);
    await pruneOldBackups(backupDir, 50);
    const backupPath = path.relative(process.cwd(), backupAbs).replaceAll("\\", "/");

    if (input.mode === "save") {
      await ensureDir(path.dirname(absolute));
      await fs.writeFile(absolute, input.buffer);
    }
    return { path: relPath, backupPath, mode: input.mode };
  },

  async openBackupFolder(): Promise<string> {
    const backupDir = path.join(process.cwd(), "report_assets", "backups");
    await ensureDir(backupDir);
    if (process.platform === "win32") {
      const child = spawn("explorer.exe", [backupDir], { detached: true, stdio: "ignore" });
      child.unref();
    } else if (process.platform === "darwin") {
      const child = spawn("open", [backupDir], { detached: true, stdio: "ignore" });
      child.unref();
    } else {
      const child = spawn("xdg-open", [backupDir], { detached: true, stdio: "ignore" });
      child.unref();
    }
    return backupDir;
  },

  async openFolder(relDirPath: string): Promise<string> {
    const normalized = normalizeRelPath(relDirPath);
    if (!normalized.startsWith("report_assets/") || normalized.includes("..")) {
      throw new TemplateNotFoundError(relDirPath);
    }
    const absDir = resolveWorkspacePath(normalized);
    await ensureDir(absDir);
    if (process.platform === "win32") {
      const child = spawn("explorer.exe", [absDir], { detached: true, stdio: "ignore" });
      child.unref();
    } else if (process.platform === "darwin") {
      const child = spawn("open", [absDir], { detached: true, stdio: "ignore" });
      child.unref();
    } else {
      const child = spawn("xdg-open", [absDir], { detached: true, stdio: "ignore" });
      child.unref();
    }
    return absDir;
  },
};


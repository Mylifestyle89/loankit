import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

import {
  TemplateNotFoundError,
  DataPlaceholderMismatchError,
  CorruptedTemplateError,
} from "./docx-engine-types";
import type { FlatTemplateData, DocxTemplateData } from "./docx-engine-types";
import {
  isSafeDocxPath,
  resolveWorkspacePath,
  normalizeRelPath,
  mergeAdjacentRuns,
  toEngineData,
  ensureDir,
  tsForFilename,
  pruneOldBackups,
} from "./docx-engine-helpers";

// Re-export types and errors for backward compatibility
export type { FlatTemplateData, AliasMap, AliasSpec, DocxTemplateData } from "./docx-engine-types";
export { TemplateNotFoundError, DataPlaceholderMismatchError, CorruptedTemplateError } from "./docx-engine-types";

export const docxEngine = {
  async generateDocx<TFlat extends FlatTemplateData>(
    templatePath: string,
    data: DocxTemplateData<TFlat>,
    outputPath: string,
  ): Promise<void> {
    // Path traversal protection
    if (!isSafeDocxPath(templatePath)) throw new TemplateNotFoundError(templatePath);
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

    // Pre-process: merge split XML runs so placeholders aren't broken
    for (const xmlFile of ["word/document.xml", "word/header1.xml", "word/header2.xml", "word/footer1.xml", "word/footer2.xml"]) {
      const entry = zip.file(xmlFile);
      if (entry) zip.file(xmlFile, mergeAdjacentRuns(entry.asText()));
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

  /** Generate DOCX and return Buffer directly — no filesystem write (Vercel-safe) */
  async generateDocxBuffer<TFlat extends FlatTemplateData>(
    templatePath: string,
    data: DocxTemplateData<TFlat>,
    options?: { preProcessZip?: (zip: PizZip) => void },
  ): Promise<Buffer> {
    // Path traversal protection
    if (!isSafeDocxPath(templatePath)) throw new TemplateNotFoundError(templatePath);
    const templateAbs = resolveWorkspacePath(templatePath);

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

    // Pre-process: merge split XML runs so placeholders aren't broken
    for (const xmlFile of ["word/document.xml", "word/header1.xml", "word/header2.xml", "word/footer1.xml", "word/footer2.xml"]) {
      const entry = zip.file(xmlFile);
      if (entry) zip.file(xmlFile, mergeAdjacentRuns(entry.asText()));
    }

    // Pre-process hook (e.g., clone sections for multi-asset templates)
    if (options?.preProcessZip) {
      options.preProcessZip(zip);
    }

    const renderData = toEngineData(data);
    let doc: InstanceType<typeof Docxtemplater>;
    try {
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: "[", end: "]" },
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

    // Post-render cleanup: remove empty table rows left by loop tag removal
    const docZip = doc.getZip() as PizZip;
    const docXml = docZip.file("word/document.xml");
    if (docXml) {
      let xmlStr = docXml.asText();
      // Remove self-closing <w:p/> (invalid OOXML)
      xmlStr = xmlStr.replace(/<w:p\/>/g, "");
      // Remove table rows whose only text content is empty (loop tag rows after rendering)
      xmlStr = xmlStr.replace(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g, (row) => {
        const text = row.replace(/<[^>]+>/g, "").trim();
        return text === "" ? "" : row;
      });
      docZip.file("word/document.xml", xmlStr);
    }

    return docZip.generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });
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

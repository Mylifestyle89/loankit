import fs from "node:fs/promises";
import path from "node:path";

import { NotFoundError, SystemError, ValidationError } from "@/core/errors/app-error";
import { CorruptedTemplateError, DataPlaceholderMismatchError, TemplateNotFoundError } from "@/lib/docx-engine";
import { type DynamicRow } from "@/core/use-cases/universal-auto-process-engine";

export function normalizeRelAssetPath(relPath: string): string {
  const normalized = relPath.replaceAll("\\", "/").trim();
  if (!normalized) throw new ValidationError("Đường dẫn file không hợp lệ.");
  if (normalized.includes("..")) throw new ValidationError("Đường dẫn không an toàn.");
  return normalized;
}

export function resolveAssetPath(relPath: string): string {
  return path.join(process.cwd(), normalizeRelAssetPath(relPath));
}

export async function ensureExists(relPath: string): Promise<void> {
  const abs = resolveAssetPath(relPath);
  try {
    await fs.access(abs);
  } catch {
    throw new NotFoundError(`Không tìm thấy file: ${relPath}`);
  }
}

export function getFileExt(relPath: string): string {
  return path.extname(relPath).toLowerCase();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function makeJobId(): string {
  return `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sanitizePart(input: unknown, fallback: string): string {
  const raw = String(input ?? "").trim();
  if (!raw) return fallback;
  return raw.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").replace(/\s+/g, " ").trim() || fallback;
}

export function mapDocxError(error: unknown): never {
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

export function resolveParentFromGroupedRecord(grouped: Record<string, unknown>, repeatKey: string): Record<string, unknown> {
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

export function parseMarkdownRows(content: string): DynamicRow[] {
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

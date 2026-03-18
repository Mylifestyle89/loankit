import fs from "node:fs/promises";
import path from "node:path";

import {
  REPORT_CONFIG_DIR,
  REPORT_INVENTORY_DIR,
  REPORT_VERSIONS_DIR,
} from "@/lib/report/constants";
import { type FieldCatalogItem } from "@/lib/report/config-schema";
import { translateGroupVi } from "@/lib/report/field-labels";
import { fileLockService } from "@/lib/report/file-lock.service";

export function tsForFilename(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(
    date.getMinutes(),
  )}${pad(date.getSeconds())}`;
}

export async function pruneOldBackups(folder: string, maxKeep: number): Promise<void> {
  const entries = await fs.readdir(folder, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort().reverse();
  const stale = files.slice(maxKeep);
  await Promise.all(stale.map((name) => fs.unlink(path.join(folder, name)).catch(() => undefined)));
}

export function toGroup(fieldKey: string): string {
  const chunks = fieldKey.split(".");
  const raw = chunks.length > 1 ? `${chunks[0]}.${chunks[1]}` : chunks[0];
  return translateGroupVi(raw);
}

export function inferType(fieldKey: string, normalizer?: string): FieldCatalogItem["type"] {
  if (normalizer?.includes("date") || fieldKey.includes("date")) {
    return "date";
  }
  if (normalizer?.includes("percent")) {
    return "percent";
  }
  if (normalizer?.includes("currency") || normalizer?.includes("percent")) {
    return "number";
  }
  if (fieldKey.includes("list") || fieldKey.includes("table")) {
    return "table";
  }
  return "text";
}

export function fsErrorCode(err: unknown): string | undefined {
  return (err as NodeJS.ErrnoException).code;
}

export function isReadOnlyFsError(err: unknown): boolean {
  const code = fsErrorCode(err);
  return code === "EROFS" || code === "EPERM";
}

export function isIgnorableFsError(err: unknown): boolean {
  const code = fsErrorCode(err);
  return code === "EROFS" || code === "ENOENT" || code === "EPERM";
}

export async function ensureDirectories(): Promise<void> {
  try {
    await fs.mkdir(REPORT_CONFIG_DIR, { recursive: true });
    await fs.mkdir(REPORT_VERSIONS_DIR, { recursive: true });
    await fs.mkdir(REPORT_INVENTORY_DIR, { recursive: true });
  } catch (err) {
    if (isIgnorableFsError(err)) return;
    throw err;
  }
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fileLockService.acquireLock("report_assets");
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  } finally {
    await fileLockService.releaseLock("report_assets");
  }
}

import fs from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { REPORT_FIELD_FORMULAS_FILE } from "@/lib/report/constants";
import { fileLockService } from "@/lib/report/file-lock.service";

const fieldFormulasSchema = z.record(z.string(), z.string());

export type FieldFormulas = z.infer<typeof fieldFormulasSchema>;

export async function loadFieldFormulas(filePath = REPORT_FIELD_FORMULAS_FILE): Promise<FieldFormulas> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return fieldFormulasSchema.parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function saveFieldFormulas(
  formulas: FieldFormulas,
  filePath = REPORT_FIELD_FORMULAS_FILE,
): Promise<FieldFormulas> {
  const parsed = fieldFormulasSchema.parse(formulas);
  await fileLockService.acquireLock("report_assets");
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(parsed, null, 2), "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "EROFS" && code !== "EPERM" && code !== "ENOENT") throw err;
  } finally {
    await fileLockService.releaseLock("report_assets");
  }
  return parsed;
}

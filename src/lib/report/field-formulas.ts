import fs from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { REPORT_FIELD_FORMULAS_FILE } from "@/lib/report/constants";

const fieldFormulasSchema = z.record(z.string(), z.string());

export type FieldFormulas = z.infer<typeof fieldFormulasSchema>;

export async function loadFieldFormulas(): Promise<FieldFormulas> {
  try {
    const raw = await fs.readFile(REPORT_FIELD_FORMULAS_FILE, "utf-8");
    return fieldFormulasSchema.parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function saveFieldFormulas(formulas: FieldFormulas): Promise<FieldFormulas> {
  const parsed = fieldFormulasSchema.parse(formulas);
  await fs.mkdir(path.dirname(REPORT_FIELD_FORMULAS_FILE), { recursive: true });
  await fs.writeFile(REPORT_FIELD_FORMULAS_FILE, JSON.stringify(parsed, null, 2), "utf-8");
  return parsed;
}

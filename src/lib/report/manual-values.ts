import fs from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { REPORT_MANUAL_VALUES_FILE } from "@/lib/report/constants";

const manualValuesSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));

export type ManualValues = z.infer<typeof manualValuesSchema>;

export async function loadManualValues(): Promise<ManualValues> {
  try {
    const raw = await fs.readFile(REPORT_MANUAL_VALUES_FILE, "utf-8");
    return manualValuesSchema.parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function saveManualValues(values: ManualValues): Promise<ManualValues> {
  const parsed = manualValuesSchema.parse(values);
  await fs.mkdir(path.dirname(REPORT_MANUAL_VALUES_FILE), { recursive: true });
  await fs.writeFile(REPORT_MANUAL_VALUES_FILE, JSON.stringify(parsed, null, 2), "utf-8");
  return parsed;
}

export function mergeFlatWithManualValues(
  baseFlat: Record<string, unknown>,
  manualValues: ManualValues,
): Record<string, unknown> {
  return { ...baseFlat, ...manualValues };
}

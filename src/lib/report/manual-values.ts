import fs from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { REPORT_MANUAL_VALUES_FILE } from "@/lib/report/constants";
import { fileLockService } from "@/lib/report/file-lock.service";

/** Scalar value for regular fields */
const scalarValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/** Repeater item: a record of field_key → any value */
const repeaterItem = z.record(z.string(), z.unknown());

/** Manual values can contain scalars (regular fields) or arrays (repeater groups) */
const manualValuesSchema = z.record(
  z.string(),
  z.union([scalarValue, z.array(repeaterItem)]),
);

export type ManualValues = Record<string, string | number | boolean | null | Record<string, unknown>[]>;

export async function loadManualValues(filePath = REPORT_MANUAL_VALUES_FILE): Promise<ManualValues> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return manualValuesSchema.parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function saveManualValues(values: ManualValues, filePath = REPORT_MANUAL_VALUES_FILE): Promise<ManualValues> {
  const parsed = manualValuesSchema.parse(values);
  await fileLockService.acquireLock("report_assets");
  try {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(parsed, null, 2), "utf-8");
  } finally {
    await fileLockService.releaseLock("report_assets");
  }
  return parsed;
}

export function mergeFlatWithManualValues(
  baseFlat: Record<string, unknown>,
  manualValues: ManualValues,
): Record<string, unknown> {
  return { ...baseFlat, ...manualValues };
}

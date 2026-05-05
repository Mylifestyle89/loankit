/**
 * @deprecated Phase 4 — Use `valuesService` from `@/services/report/values.service` instead.
 *
 * This module reads/writes the GLOBAL `manual_values.json` file. It cannot
 * attribute data to a specific Customer or Loan, which caused the data-loss
 * bug Phase 1-3 set out to fix.
 *
 * Reduced Phase 4 status: kept functional with warn-once + per-call @deprecated
 * tags. Service swap to `valuesService` blocked by architecture mismatch
 * (mappingInstanceId vs loanId) — see Phase 5 plan.
 *
 * Phase 5: file deleted entirely after architecture reconciliation.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { REPORT_MANUAL_VALUES_FILE } from "@/lib/report/constants";
import { fileLockService } from "@/lib/report/file-lock.service";
import { valuesRecordSchema } from "@/lib/report/values-schema";

import type { ValuesRecord } from "@/lib/report/values-schema";

// Module-init warn-once (avoid log spam from per-call warnings)
let warned = false;
function warnDeprecatedOnce(): void {
  if (warned) return;
  warned = true;
  console.warn(
    "[manual-values] DEPRECATED: this module reads/writes a GLOBAL file that " +
      "cannot attribute data to Customer/Loan. Migrate callers to valuesService " +
      "(@/services/report/values.service). See plans/260505-1007-phase1-... Phase 5.",
  );
}

/** @deprecated Use `ValuesRecord` from `@/lib/report/values-schema` instead. */
export type ManualValues = ValuesRecord;

const manualValuesSchema = valuesRecordSchema;

/** @deprecated Phase 4 — use `valuesService.getCustomerProfile/getDossierValues/getMergedValuesForExport`. */
export async function loadManualValues(filePath = REPORT_MANUAL_VALUES_FILE): Promise<ManualValues> {
  warnDeprecatedOnce();
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return manualValuesSchema.parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** @deprecated Phase 4 — use `valuesService.saveCustomerProfile/saveDossierValues/patch*`. */
export async function saveManualValues(values: ManualValues, filePath = REPORT_MANUAL_VALUES_FILE): Promise<ManualValues> {
  warnDeprecatedOnce();
  const parsed = manualValuesSchema.parse(values);
  await fileLockService.acquireLock("report_assets");
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(parsed, null, 2), "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "EROFS" && code !== "EPERM" && code !== "ENOENT") throw err;
    // Vercel read-only FS — manual values not persisted to file
  } finally {
    await fileLockService.releaseLock("report_assets");
  }
  return parsed;
}

/** @deprecated Phase 4 — use `valuesService.getMergedValuesForExport(loanId)` for per-loan merge. */
export function mergeFlatWithManualValues(
  baseFlat: Record<string, unknown>,
  manualValues: ManualValues,
): Record<string, unknown> {
  return { ...baseFlat, ...manualValues };
}

/**
 * values-resolver.ts — unified loader for report module consumers.
 *
 * Semantics:
 *   - loanId provided → query DB only. Empty result returns {} (no FS leak).
 *     Stale FK (loan deleted) → graceful empty, never throws.
 *   - loanId === null → fallback to global FS file IF flag enabled, else {}.
 *
 * Why this split: global manual_values.json has no per-loan attribution; using
 * it as fallback for a known loanId would silently leak another loan's data.
 * Migration script (Phase 2) already orphaned that data — leave it orphaned.
 */
import { NotFoundError } from "@/core/errors/app-error";
import { isLegacyFallbackEnabled } from "@/lib/report/constants";
import { loadManualValues } from "@/lib/report/manual-values";
import type { ValuesRecord } from "@/lib/report/values-schema";
import { valuesService } from "./values.service";

const LOG_PREFIX = "[report-values]";

export async function resolveValuesForLoan(loanId: string | null | undefined): Promise<ValuesRecord> {
  if (loanId) {
    try {
      return await valuesService.getMergedValuesForExport(loanId);
    } catch (e) {
      if (e instanceof NotFoundError) {
        console.warn(`${LOG_PREFIX} loan ${loanId} not found, treating values as empty.`);
        return {};
      }
      throw e;
    }
  }
  if (!isLegacyFallbackEnabled()) return {};
  console.warn(`${LOG_PREFIX} FS fallback used (no loanId scope).`);
  return await loadManualValues();
}

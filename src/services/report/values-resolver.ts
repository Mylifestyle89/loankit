/**
 * values-resolver.ts — load merged report values for a loan.
 *
 * DB is the only source of truth. A stale loan FK degrades to empty values
 * rather than throwing so callers (export, validation) don't crash on rows
 * pointing at a deleted loan. Callers without a loanId receive {} and must
 * handle empty state in their UI.
 */
import { NotFoundError } from "@/core/errors/app-error";
import type { ValuesRecord } from "@/lib/report/values-schema";
import { valuesService } from "./values.service";

const LOG_PREFIX = "[report-values]";

export async function resolveValuesForLoan(loanId: string | null | undefined): Promise<ValuesRecord> {
  if (!loanId) return {};
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

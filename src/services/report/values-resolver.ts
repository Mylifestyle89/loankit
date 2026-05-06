/**
 * values-resolver.ts — DB-only loader for report module consumers.
 *
 * Phase 5a: dual-read window closed. No FS fallback — all values come from
 * Loan.dossierValuesJson + Customer.customerProfileValuesJson via valuesService.
 * Stale loan FK degrades gracefully (NotFoundError → empty values, no throw).
 *
 * Callers without a loanId (legacy/orphan paths) receive {} and must handle
 * empty state in their UI.
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

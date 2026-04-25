/**
 * Disbursement service — barrel re-export.
 * Implementation split across:
 *   disbursement-crud.service.ts    — create, update, fullUpdate, delete, getById
 *   disbursement-queries.service.ts — list, aggregate, suggestions, surplus/deficit
 */
import { getById, create, update, fullUpdate, deleteDisbursement } from "./disbursement-crud.service";
import { listByLoan, getSummaryByLoan, list, getFieldSuggestions, getSurplusDeficit } from "./disbursement-queries.service";

export type { BeneficiaryLineInput, CreateDisbursementInput, UpdateDisbursementInput, FullUpdateDisbursementInput, DisbursementFieldSuggestions, ListByLoanOpts } from "./disbursement-service-types";

export const disbursementService = {
  listByLoan,
  getSummaryByLoan,
  list,
  getById,
  create,
  update,
  fullUpdate,
  delete: deleteDisbursement,
  getFieldSuggestions,
  getSurplusDeficit,
};

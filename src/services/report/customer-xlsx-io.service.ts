/**
 * customer-xlsx-io.service.ts
 * Barrel re-export — XLSX export/import for customer data with nested relations.
 * Sub-modules: customer-xlsx-export.service.ts, customer-xlsx-import.service.ts.
 */

export {
  exportCustomersToXlsx,
  toDateStr,
  type CustomerWithRelations,
  type LoanRecord,
  type DisbursementRecord,
  type InvoiceRecord,
  type BeneficiaryRecord,
  type DisbursementBeneficiaryRecord,
} from "./customer-xlsx-export.service";

export {
  parseXlsxToImportData,
  groupBy,
} from "./customer-xlsx-import.service";

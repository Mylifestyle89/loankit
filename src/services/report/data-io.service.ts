/**
 * Data-IO service — import/export customers & field templates.
 * Composed from sub-modules; re-exports as `dataIoService` object for backward compat.
 */
import { importData } from "./data-io-import.service";
import { exportData, exportDataStream } from "./data-io-export.service";

export { importData, exportData, exportDataStream };

export type {
  ImportLoanRecord,
  ImportBeneficiaryRecord,
  ImportDisbursementRecord,
  ImportInvoiceRecord,
  ImportDisbursementBeneficiaryRecord,
} from "./data-io-import.service";

export const dataIoService = {
  importData,
  exportData,
  exportDataStream,
};

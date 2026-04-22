/**
 * Invoice service — types + re-export barrel composing CRUD and query sub-modules.
 * Consumers import from this file; `invoiceService` object name unchanged.
 */
import {
  getById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} from "./invoice-crud.service";
import {
  listByDisbursement,
  listAll,
  getVirtualInvoiceEntries,
  getCustomerSummary,
  markOverdue,
} from "./invoice-queries.service";

export type CreateInvoiceInput = {
  disbursementId: string;
  disbursementBeneficiaryId?: string;
  invoiceNumber: string;
  supplierName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  customDeadline?: string;
  notes?: string;
};

export type UpdateInvoiceInput = {
  invoiceNumber?: string;
  supplierName?: string;
  amount?: number;
  issueDate?: string;
  dueDate?: string;
  customDeadline?: string | null;
  notes?: string | null;
  status?: string;
};

export const invoiceService = {
  listByDisbursement,
  listAll,
  getVirtualInvoiceEntries,
  getById,
  create: createInvoice,
  update: updateInvoice,
  delete: deleteInvoice,
  markOverdue,
  getCustomerSummary,
};

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

export type RetailLineItem = {
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  amount: number;
};

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
  /** Retail invoice line items — when provided, amount is auto-computed as Σ item.amount */
  items?: RetailLineItem[];
  templateType?: string;
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
  items?: RetailLineItem[];
  templateType?: string | null;
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

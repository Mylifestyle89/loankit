/**
 * import-types — shared type definitions for the data-io import pipeline.
 * Consumed by import-prefetch, import-customer-upsert, import-relations-create,
 * and the main data-io-import.service orchestrator.
 */
import type { ImportCustomerRecord } from "./_shared";

export type ImportLoanRecord = {
  contractNumber: string;
  loanAmount: number;
  interestRate?: number | null;
  startDate: string;
  endDate: string;
  purpose?: string | null;
  disbursementCount?: string | null;
  collateralValue?: number | null;
  securedObligation?: number | null;
  disbursementLimitByAsset?: number | null;
  status?: string;
  beneficiaries?: ImportBeneficiaryRecord[];
  disbursements?: ImportDisbursementRecord[];
};

export type ImportBeneficiaryRecord = {
  name: string;
  accountNumber?: string | null;
  bankName?: string | null;
};

export type ImportDisbursementRecord = {
  amount: number;
  disbursementDate: string;
  description?: string | null;
  status?: string;
  currentOutstanding?: number | null;
  debtAmount?: number | null;
  totalOutstanding?: number | null;
  purpose?: string | null;
  supportingDoc?: string | null;
  loanTerm?: number | null;
  repaymentEndDate?: string | null;
  principalSchedule?: string | null;
  interestSchedule?: string | null;
  invoices?: ImportInvoiceRecord[];
  beneficiaryLines?: ImportDisbursementBeneficiaryRecord[];
};

export type ImportInvoiceRecord = {
  invoiceNumber: string;
  supplierName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  customDeadline?: string | null;
  status?: string;
  notes?: string | null;
};

export type ImportDisbursementBeneficiaryRecord = {
  beneficiaryName: string;
  accountNumber?: string | null;
  bankName?: string | null;
  amount: number;
  invoiceStatus?: string;
  invoiceAmount?: number;
  invoices?: ImportInvoiceRecord[];
};

/** V2 customer record — extends base with nested loan tree */
export type ImportV2CustomerRecord = ImportCustomerRecord & {
  loans?: ImportLoanRecord[];
};

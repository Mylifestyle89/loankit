/** Types for disbursement service input/output */
import type { TrackingStatus } from "@/lib/invoice-tracking-format-helpers";

export type BeneficiaryLineInput = {
  beneficiaryId?: string | null;
  beneficiaryName: string;
  address?: string;
  accountNumber?: string;
  bankName?: string;
  amount: number;
  invoiceStatus?: "pending" | "has_invoice" | "bang_ke";
  invoices?: {
    supplierName: string;
    invoiceNumber: string;
    issueDate: string;
    amount: number;
    qty?: number;
    unitPrice?: number;
    itemsJson?: string;    // Retail invoice line items JSON
    templateType?: string; // Retail invoice template type
  }[];
};

export type CreateDisbursementInput = {
  loanId: string;
  amount: number;
  disbursementDate: string;
  description?: string;
  currentOutstanding?: number;
  debtAmount?: number;
  totalOutstanding?: number;
  purpose?: string;
  supportingDoc?: string;
  loanTerm?: number;
  termUnit?: string;
  repaymentEndDate?: string;
  principalSchedule?: string;
  interestSchedule?: string;
  beneficiaries?: BeneficiaryLineInput[];
};

export type UpdateDisbursementInput = {
  amount?: number;
  disbursementDate?: string;
  description?: string | null;
  status?: TrackingStatus;
};

export type FullUpdateDisbursementInput = {
  amount: number;
  disbursementDate: string;
  description?: string | null;
  status?: string;
  currentOutstanding?: number;
  debtAmount?: number;
  totalOutstanding?: number;
  purpose?: string;
  supportingDoc?: string;
  loanTerm?: number;
  termUnit?: string;
  repaymentEndDate?: string;
  principalSchedule?: string;
  interestSchedule?: string;
  beneficiaries?: BeneficiaryLineInput[];
};

export type DisbursementFieldSuggestions = {
  principalSchedule: string[];
  interestSchedule: string[];
  purpose: string[];
};

export type ListByLoanOpts = {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

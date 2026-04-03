export type Customer = {
  id: string;
  customer_name: string;
  email?: string | null;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  customDeadline?: string | null;
  status: string;
  notes?: string | null;
  disbursementId?: string;
  disbursementBeneficiaryId?: string;
  disbursementBeneficiary?: { amount: number; invoiceAmount: number } | null;
  disbursement?: {
    id: string;
    amount: number;
    disbursementDate?: string;
    loan?: { contractNumber: string; customer?: { customer_name: string } };
  };
};

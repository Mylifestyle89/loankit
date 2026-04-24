/** Types for customer service input/output */

export type CreateCustomerInput = {
  customer_code: string;
  customer_name: string;
  customer_type?: string; // "corporate" | "individual"
  address?: string | null;
  main_business?: string | null;
  charter_capital?: number | null;
  legal_representative_name?: string | null;
  legal_representative_title?: string | null;
  organization_type?: string | null;
  // Individual-specific
  cccd?: string | null;
  cccd_old?: string | null;
  cccd_issued_date?: string | null;
  cccd_issued_place?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  phone?: string | null;
  marital_status?: string | null;
  spouse_name?: string | null;
  spouse_cccd?: string | null;
  bank_account?: string | null;
  bank_name?: string | null;
  cic_product_name?: string | null;
  cic_product_code?: string | null;
  email?: string | null;
  active_branch_id?: string | null;
  relationship_officer?: string | null;
  appraiser?: string | null;
  approver_name?: string | null;
  approver_title?: string | null;
  /** JSON array of legal documents (Tài liệu pháp lý — TLPA) rendered via
   *  [#TLPA]...[/TLPA] loop. Stored as stringified JSON on the Customer row. */
  documents_pa_json?: string | null;
  data_json?: Record<string, unknown>;
  /** ID of the user who created this customer record (set by API route) */
  createdById?: string | null;
};

export type UpdateCustomerInput = Partial<Omit<CreateCustomerInput, "createdById">>;

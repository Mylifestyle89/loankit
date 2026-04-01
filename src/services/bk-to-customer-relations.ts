/**
 * Extracts related records (co-borrowers, collaterals, credit info, loans, etc.)
 * from BK-imported framework values for bulk creation alongside a Customer.
 */

// ── Helpers ──

/** Generic batch extractor — maps each instance through a single-item extractor, filters nulls */
function extractAll<T>(fn: (v: Record<string, unknown>) => T | null, instances: Record<string, unknown>[]): T[] {
  return instances.map(fn).filter((x): x is T => x !== null);
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    if (cleaned === "") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  // Try dd/mm/yyyy
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// ── Co-Borrower from TV asset ──

type CoBorrowerData = {
  full_name: string;
  title?: string | null;
  id_type?: string | null;
  id_number?: string | null;
  id_issued_date?: string | null;
  id_issued_place?: string | null;
  birth_year?: string | null;
  phone?: string | null;
  current_address?: string | null;
  permanent_address?: string | null;
  relationship?: string | null;
  agribank_debt?: string | null;
};

export function extractCoBorrower(values: Record<string, unknown>): CoBorrowerData | null {
  const name = str(values["A.general.spouse_name"]);
  if (!name) return null;
  return {
    full_name: name,
    title: str(values["A.general.spouse_gender_prefix"]),
    id_type: str(values["A.general.spouse_id_type"]),
    id_number: str(values["A.general.spouse_cccd"]),
    id_issued_date: str(values["A.general.spouse_id_issue_date"]),
    id_issued_place: str(values["A.general.spouse_id_issue_location"]),
    birth_year: str(values["A.general.spouse_year_of_birth"]),
    phone: str(values["A.general.spouse_phone"]),
    current_address: str(values["A.general.spouse_address"]),
    permanent_address: str(values["A.general.spouse_permanent_address"]),
    relationship: str(values["A.general.spouse_relationship"]),
    agribank_debt: str(values["A.general.spouse_outstanding_agri"]),
  };
}

export const extractAllCoBorrowers = (i: Record<string, unknown>[]) => extractAll(extractCoBorrower, i);

// ── Credit at Agribank from VBA asset ──

type CreditAgribankData = {
  branch_name?: string | null;
  debt_group?: string | null;
  debt_amount?: string | null;
  loan_term?: string | null;
  loan_purpose?: string | null;
};

export function extractCreditAgribank(values: Record<string, unknown>): CreditAgribankData | null {
  const bankName = str(values["A.credit.vba_bank_name"]);
  const debtAmount = str(values["A.credit.vba_total_outstanding"]);
  if (!bankName && !debtAmount) return null;
  return {
    branch_name: bankName,
    debt_group: str(values["A.credit.vba_debt_group"]),
    debt_amount: debtAmount,
    loan_term: str(values["A.credit.vba_loan_term"]),
    loan_purpose: str(values["A.credit.vba_loan_purpose"]),
  };
}

export const extractAllCreditAgribank = (i: Record<string, unknown>[]) => extractAll(extractCreditAgribank, i);

// ── Credit at Other from TCTD asset ──

type CreditOtherData = {
  institution_name?: string | null;
  debt_group?: string | null;
  debt_amount?: string | null;
  loan_term?: string | null;
  loan_purpose?: string | null;
};

export function extractCreditOther(values: Record<string, unknown>): CreditOtherData | null {
  const bankName = str(values["A.credit.other_bank_name"]);
  const debtAmount = str(values["A.credit.other_total_outstanding"]);
  if (!bankName && !debtAmount) return null;
  return {
    institution_name: bankName,
    debt_group: str(values["A.credit.other_debt_group"]),
    debt_amount: debtAmount,
    loan_term: str(values["A.credit.other_loan_term"]),
    loan_purpose: str(values["A.credit.other_loan_purpose"]),
  };
}

export const extractAllCreditOther = (i: Record<string, unknown>[]) => extractAll(extractCreditOther, i);

// ── Collateral from SĐ asset ──

type CollateralData = {
  collateral_type: string;
  name: string;
  total_value?: number | null;
  obligation?: number | null;
  properties_json: string;
};

export function extractCollateral(values: Record<string, unknown>): CollateralData | null {
  const name = str(values["A.collateral.collateral_name"]);
  if (!name) return null;

  const props: Record<string, unknown> = {};
  // Map all A.collateral.* keys to properties
  const propMapping: Record<string, string> = {
    "A.collateral.land_owner_name": "owner_name",
    "A.collateral.land_owner_name_uppercase": "owner_name_uppercase",
    "A.collateral.certificate_name": "certificate_name",
    "A.collateral.certificate_serial": "serial",
    "A.collateral.land_address": "land_address",
    "A.collateral.land_area": "land_area",
    "A.collateral.plot_number": "lot_number",
    "A.collateral.map_sheet_number": "map_sheet",
    "A.collateral.land_purpose": "land_purpose",
    "A.collateral.land_total_value": "land_value",
    "A.collateral.house_value": "house_value",
    "A.collateral.collateral_contract_number": "mortgage_contract",
    "A.collateral.collateral_contract_date": "mortgage_date",
    "A.collateral.issuing_authority": "issuing_authority",
    "A.collateral.certificate_issue_date": "certificate_issue_date",
    "A.collateral.registry_number": "registry_number",
    "A.collateral.land_origin": "land_origin",
    "A.collateral.land_use_term": "land_use_term",
    "A.collateral.house_type": "house_type",
    "A.collateral.construction_area": "construction_area",
    "A.collateral.ownership_form": "ownership_form",
    "A.collateral.owner_borrower_relationship": "owner_borrower_relationship",
    "A.collateral.advantage_summary": "advantage_summary",
    "A.collateral.insurance_status": "insurance_status",
    "A.collateral.asset_usage_status": "asset_usage_status",
    "A.collateral.collateral_category": "collateral_category",
    "A.collateral.max_credit_ratio_land": "max_credit_ratio_land",
    "A.collateral.max_credit_ratio_attached": "max_credit_ratio_attached",
    "A.collateral.max_obligation": "max_obligation",
    "A.collateral.max_obligation_in_words": "max_obligation_in_words",
    "A.collateral.loan_to_value_ratio": "loan_to_value_ratio",
    "A.collateral.revaluation_period": "revaluation_period",
    "A.collateral.appraisal_purpose": "appraisal_purpose",
  };

  for (const [fwKey, propKey] of Object.entries(propMapping)) {
    const v = str(values[fwKey]);
    if (v) props[propKey] = v;
  }

  return {
    collateral_type: "qsd_dat",
    name,
    total_value: num(values["A.collateral.total_asset_value"]),
    obligation: num(values["A.collateral.obligation_amount"]),
    properties_json: JSON.stringify(props),
  };
}

export const extractAllCollaterals = (i: Record<string, unknown>[]) => extractAll(extractCollateral, i);

// ── STK (Sổ Tiết kiệm / Giấy tờ có giá) → Collateral type "tiet_kiem" ──

export function extractSavingsCollateral(values: Record<string, unknown>): CollateralData | null {
  const serial = str(values["A.collateral.tk_serial"]);
  if (!serial) return null;

  const issuer = str(values["A.collateral.tk_issuer"]) ?? "";
  const name = `TTK ${serial} - ${issuer}`.trim();

  const props: Record<string, unknown> = { _subtype: "ttk" };
  const propMapping: Record<string, string> = {
    "A.collateral.tk_serial": "serial",
    "A.collateral.tk_paper_number": "paper_number",
    "A.collateral.tk_paper_type": "paper_type",
    "A.collateral.tk_issuer": "issuer",
    "A.collateral.tk_face_value": "face_value",
    "A.collateral.tk_term": "term",
    "A.collateral.tk_balance": "balance",
    "A.collateral.tk_interest_rate": "interest_rate",
    "A.collateral.tk_issue_date": "issue_date",
    "A.collateral.tk_maturity_date": "maturity_date",
    "A.collateral.tk_max_loan": "max_loan",
    "A.collateral.tk_currency": "currency",
  };
  for (const [fwKey, propKey] of Object.entries(propMapping)) {
    const v = str(values[fwKey]);
    if (v) props[propKey] = v;
  }

  return {
    collateral_type: "tiet_kiem",
    name,
    total_value: num(values["A.collateral.tk_balance"]) ?? num(values["A.collateral.tk_total_value"]),
    obligation: num(values["A.collateral.tk_obligation"]),
    properties_json: JSON.stringify(props),
  };
}

export const extractAllSavingsCollaterals = (i: Record<string, unknown>[]) => extractAll(extractSavingsCollateral, i);

// ── Loan from HĐTD asset ──

type LoanData = {
  contractNumber: string;
  loanAmount: number;
  interestRate?: number | null;
  startDate: Date;
  endDate: Date;
  purpose?: string | null;
  loan_method?: string;
  collateralValue?: number | null;
  securedObligation?: number | null;
  lending_method?: string | null;
  interest_method?: string | null;
  principal_schedule?: string | null;
  interest_schedule?: string | null;
  total_capital_need?: number | null;
  equity_amount?: number | null;
  cash_equity?: number | null;
  labor_equity?: number | null;
  other_loan?: number | null;
  other_asset_equity?: number | null;
  customer_rating?: string | null;
  debt_group?: string | null;
  scoring_period?: string | null;
};

export function extractLoan(values: Record<string, unknown>): LoanData | null {
  const contractNumber = str(values["A.credit.current_credit_contract_number"]);
  const loanAmount = num(values["A.proposal.loan_amount_agribank"]);
  if (!contractNumber || !loanAmount) return null;

  const startDate = parseDate(values["A.credit.contract_sign_date"]) ?? parseDate(values["A.proposal.loan_start_date"]) ?? new Date();
  const endDate = parseDate(values["A.proposal.loan_maturity_date"]) ?? new Date(startDate.getTime() + 365 * 24 * 3600000);

  return {
    contractNumber,
    loanAmount,
    interestRate: num(values["A.credit.current_interest_rate"]),
    startDate,
    endDate,
    purpose: str(values["A.proposal.loan_purpose"]),
    loan_method: str(values["A.credit.lending_method"]) ?? "tung_lan",
    collateralValue: num(values["A.collateral.total_collateral_value"]),
    securedObligation: num(values["A.collateral.total_secured_obligation"]),
    lending_method: str(values["A.credit.lending_method"]),
    interest_method: str(values["A.credit.interest_rate_method"]),
    principal_schedule: str(values["A.credit.principal_repayment_schedule"]),
    interest_schedule: str(values["A.credit.interest_repayment_schedule"]),
    total_capital_need: num(values["A.proposal.total_credit_demand"]),
    equity_amount: num(values["A.proposal.counterpart_capital"]),
    cash_equity: num(values["A.proposal.cash_equity"]),
    labor_equity: num(values["A.proposal.labor_equity"]),
    other_loan: num(values["A.proposal.other_bank_loan"]),
    other_asset_equity: num(values["A.proposal.other_asset_equity"]),
    customer_rating: str(values["A.credit.rating_agribank"]),
    debt_group: str(values["A.credit.debt_group_latest"]),
    scoring_period: str(values["A.credit.rating_date"]),
  };
}

// ── Disbursement from GN asset ──

type DisbursementData = {
  amount: number;
  currentOutstanding?: number | null;
  debtAmount?: number | null;
  totalOutstanding?: number | null;
  purpose?: string | null;
  supportingDoc?: string | null;
};

export function extractDisbursement(values: Record<string, unknown>): DisbursementData | null {
  const amount = num(values["A.proposal.disbursement_amount"]);
  if (!amount) return null;
  return {
    amount,
    currentOutstanding: num(values["A.credit.current_outstanding"]),
    debtAmount: num(values["A.proposal.disbursement_amount"]),
    totalOutstanding: num(values["A.credit.total_outstanding"]),
    purpose: str(values["A.proposal.disbursement_purpose"]),
    supportingDoc: str(values["A.proposal.supporting_documents"]),
  };
}

// ── Beneficiary from UNC asset ──

type BeneficiaryData = {
  name: string;
  accountNumber?: string | null;
  bankName?: string | null;
};

export function extractBeneficiary(values: Record<string, unknown>): BeneficiaryData | null {
  const name = str(values["A.economic_docs.beneficiary_name"]);
  if (!name) return null;
  return {
    name,
    accountNumber: str(values["A.economic_docs.beneficiary_account"]),
    bankName: str(values["A.economic_docs.beneficiary_bank"]),
  };
}

// ── Batch extractors for multi-asset support ──
export const extractAllDisbursements = (i: Record<string, unknown>[]) => extractAll(extractDisbursement, i);
export const extractAllBeneficiaries = (i: Record<string, unknown>[]) => extractAll(extractBeneficiary, i);

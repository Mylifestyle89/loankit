export type Loan = {
  id: string;
  contractNumber: string;
  loanAmount: number;
  interestRate: number | null;
  loan_method: string;
  collateralValue: number | null;
  startDate: string;
  endDate: string;
  status: string;
  purpose: string | null;
  customer: { id: string; customer_name: string; customer_type?: string };
  _count: { disbursements: number };
  securedObligation: number | null;
  disbursementLimitByAsset: number | null;
  isKhcn: boolean;
  selectedCollateralIds: string;
};

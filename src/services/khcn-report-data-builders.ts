/**
 * Data builder helpers for KHCN report template placeholders.
 * Re-exports from split modules for backward compatibility.
 */
export { buildCustomerAliases, buildBranchStaffData } from "./khcn-builder-customer-branch";
export { buildLoanExtendedData, buildDisbursementExtendedData, buildBeneficiaryLoopData, OVERDUE_INTEREST_LABEL, LATE_PAYMENT_INTEREST_LABEL } from "./khcn-builder-loan-disbursement";
export { getCollateralCount } from "./khcn-builder-collateral-helpers";
export { buildLandCollateralData } from "./khcn-builder-collateral-land";
export { buildMovableCollateralData } from "./khcn-builder-collateral-movable";
export { buildSavingsCollateralData, buildOtherCollateralData } from "./khcn-builder-collateral-savings-other";
export { buildCoBorrowerData, buildRelatedPersonData } from "./khcn-builder-persons";
export { buildCreditAgribankData, buildCreditOtherData, buildUnifiedCreditLoop } from "./khcn-builder-credit";
export { buildLoanPlanExtendedData } from "./khcn-builder-loan-plan";

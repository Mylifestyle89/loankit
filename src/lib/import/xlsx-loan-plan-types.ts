// Types for XLSX Loan Plan Parser results

import type { CostItem, RevenueItem } from "@/lib/loan-plan/loan-plan-types";

export type XlsxDetectedType = "A" | "B" | "S" | "C" | "unknown";

export type XlsxParseMeta = {
  name?: string;
  loanAmount?: number;
  interestRate?: number;
  turnoverCycles?: number;
  tax?: number;
  loan_method?: string;
  counterpartCapital?: number;
  counterpartRatio?: string;
  loanMonths?: number;
  totalRevenue?: number;
  totalCost?: number;
  profit?: number;
  yield?: number;
  unitPrice?: number;
  depreciationYears?: number;
  assetUnitPrice?: number;
  landAreaSau?: number;
  constructionContractNo?: string;
  constructionContractDate?: string;
  preferentialRate?: number;
  farmAddress?: string;
  creditAgribank?: Record<string, string>;
  creditOther?: Record<string, string>;
  oldContract?: Record<string, string>;
  [key: string]: unknown;
};

export type XlsxParseResult = {
  status: "success" | "partial" | "error";
  message: string;
  detectedType: XlsxDetectedType;
  costItems: CostItem[];
  revenueItems: RevenueItem[];
  meta: XlsxParseMeta;
  warnings: string[];
};

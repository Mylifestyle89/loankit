/**
 * customer-detail-tabs-config.ts
 *
 * Tab configuration arrays for CustomerDetailView.
 * Separated to keep the main view component under 200 lines.
 */

export const corporateTabs = [
  { key: "branch", label: "Nơi cho vay" },
  { key: "info", label: "Người vay" },
  { key: "credit", label: "Thông tin tín dụng" },
  { key: "loans", label: "Khoản vay" },
  { key: "loan-plans", label: "Phương án vay vốn" },
  { key: "collateral", label: "TSBĐ" },
  { key: "templates", label: "In mẫu biểu" },
] as const;

export const individualTabs = [
  { key: "branch", label: "Nơi cho vay" },
  { key: "info", label: "Thông tin" },
  { key: "loans-credit", label: "Khoản vay & Tín dụng" },
  { key: "loan-plans", label: "Phương án vay vốn" },
  { key: "collateral", label: "TSBĐ" },
  { key: "templates", label: "In mẫu biểu" },
] as const;

export type TabKey = (typeof corporateTabs)[number]["key"] | (typeof individualTabs)[number]["key"];

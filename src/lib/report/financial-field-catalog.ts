/**
 * financial-field-catalog.ts
 *
 * Barrel re-export — assembles FINANCIAL_FIELD_CATALOG from domain sub-modules.
 * Sub-modules: cdkt, kqkd, ratios, summary.
 *
 * Architecture: imported by fs-store.ts to seed FrameworkState
 * and by the financial-analysis service to drive AI prompts.
 */

import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { CATALOG_CDKT } from "./financial-field-catalog-cdkt";
import { CATALOG_KQKD } from "./financial-field-catalog-kqkd";
import { CATALOG_RATIOS } from "./financial-field-catalog-ratios";
import { CATALOG_FINANCIAL_SUMMARY } from "./financial-field-catalog-summary";

export { CATALOG_CDKT } from "./financial-field-catalog-cdkt";
export { CATALOG_KQKD } from "./financial-field-catalog-kqkd";
export { CATALOG_RATIOS } from "./financial-field-catalog-ratios";
export { CATALOG_FINANCIAL_SUMMARY } from "./financial-field-catalog-summary";

export const FINANCIAL_FIELD_CATALOG: FieldCatalogItem[] = [
  ...CATALOG_CDKT,
  ...CATALOG_KQKD,
  ...CATALOG_RATIOS,
  ...CATALOG_FINANCIAL_SUMMARY,
];

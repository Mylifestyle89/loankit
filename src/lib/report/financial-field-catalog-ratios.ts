/**
 * financial-field-catalog-ratios.ts
 * Barrel re-export — assembles CATALOG_RATIOS from liquidity/leverage + activity/profitability.
 */

import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { CATALOG_RATIOS_LIQUIDITY_LEVERAGE } from "./financial-field-catalog-ratios-liquidity-leverage";
import { CATALOG_RATIOS_ACTIVITY_PROFITABILITY } from "./financial-field-catalog-ratios-activity-profitability";

export { CATALOG_RATIOS_LIQUIDITY_LEVERAGE } from "./financial-field-catalog-ratios-liquidity-leverage";
export { CATALOG_RATIOS_ACTIVITY_PROFITABILITY } from "./financial-field-catalog-ratios-activity-profitability";

export const CATALOG_RATIOS: FieldCatalogItem[] = [
  ...CATALOG_RATIOS_LIQUIDITY_LEVERAGE,
  ...CATALOG_RATIOS_ACTIVITY_PROFITABILITY,
];

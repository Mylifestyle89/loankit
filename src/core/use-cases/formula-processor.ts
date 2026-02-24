import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { evaluateFieldFormula } from "@/lib/report/field-calc";

export function computeEffectiveValues(params: {
  values: Record<string, unknown>;
  formulas: Record<string, string>;
  fieldCatalog: FieldCatalogItem[];
}): Record<string, unknown> {
  const base = { ...params.values };
  const fieldTypeMap = new Map(params.fieldCatalog.map((f) => [f.field_key, f.type]));
  for (const [fieldKey, formula] of Object.entries(params.formulas)) {
    const fieldType = fieldTypeMap.get(fieldKey) ?? "text";
    const v = evaluateFieldFormula(formula, base, fieldType);
    if (v !== null) base[fieldKey] = v;
  }
  return base;
}


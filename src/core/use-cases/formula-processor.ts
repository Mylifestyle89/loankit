import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { evaluateFieldFormula } from "@/lib/report/field-calc";

/**
 * Enrich context để hỗ trợ tham chiếu field bằng label_vi (tên hiển thị)
 * + Flatten repeater group values để sum() có thể access
 *
 * Ví dụ:
 * - field có label_vi = "Tổng giá trị" → context["Tổng giá trị"] = context[field_key]
 * - field trong repeater group → context[field_key] = [val1, val2, val3] (array từ repeater items)
 */
export function enrichContextWithLabels(
  baseContext: Record<string, unknown>,
  fieldCatalog: FieldCatalogItem[],
): Record<string, unknown> {
  const enriched = { ...baseContext };

  // 1. Thêm label_vi keys
  for (const field of fieldCatalog) {
    if (field.label_vi && !(field.label_vi in enriched)) {
      enriched[field.label_vi] = baseContext[field.field_key];
    }
  }

  // 2. Flatten repeater field values (data-driven)
  // Scan context: tìm keys có value là array of objects → repeater groups
  // Sau đó match fields theo group path

  // Build group lookup: group path → field definitions
  const fieldsByGroup = new Map<string, FieldCatalogItem[]>();
  for (const field of fieldCatalog) {
    const list = fieldsByGroup.get(field.group);
    if (list) list.push(field);
    else fieldsByGroup.set(field.group, [field]);
  }

  // Scan context cho repeater arrays
  for (const [key, value] of Object.entries(baseContext)) {
    if (!Array.isArray(value) || value.length === 0) continue;
    // Kiểm tra phần tử đầu tiên có phải object không
    if (typeof value[0] !== "object" || value[0] === null) continue;

    // Tìm fields thuộc group này
    const fieldsInGroup = fieldsByGroup.get(key);
    if (!fieldsInGroup) continue;

    // Extract values cho mỗi field từ repeater items
    for (const field of fieldsInGroup) {
      const fieldKey = field.field_key;
      const values: unknown[] = [];
      for (const item of value) {
        if (typeof item === "object" && item !== null && fieldKey in item) {
          values.push(item[fieldKey as keyof typeof item]);
        }
      }

      if (values.length > 0) {
        enriched[fieldKey] = values;
        // Cũng add label_vi version (overwrite undefined từ Step 1)
        if (field.label_vi) {
          enriched[field.label_vi] = values;
        }
      }
    }
  }

  return enriched;
}

export function computeEffectiveValues(params: {
  values: Record<string, unknown>;
  formulas: Record<string, string>;
  fieldCatalog: FieldCatalogItem[];
}): Record<string, unknown> {
  const base = enrichContextWithLabels(params.values, params.fieldCatalog);
  const fieldTypeMap = new Map(params.fieldCatalog.map((f) => [f.field_key, f.type]));
  // Build field_key → label_vi map so we can keep label_vi keys in sync
  const labelMap = new Map(
    params.fieldCatalog.filter((f) => f.label_vi).map((f) => [f.field_key, f.label_vi]),
  );
  const formulaEntries = Object.entries(params.formulas);

  // 2-pass evaluation: resolves formula dependencies regardless of insertion order.
  // Pass 1 computes what it can; pass 2 picks up formulas that depend on pass 1 results.
  for (let pass = 0; pass < 2; pass++) {
    for (const [fieldKey, formula] of formulaEntries) {
      const fieldType = fieldTypeMap.get(fieldKey) ?? "text";
      const v = evaluateFieldFormula(formula, base, fieldType);
      if (v !== null) {
        base[fieldKey] = v;
        const labelVi = labelMap.get(fieldKey);
        if (labelVi) base[labelVi] = v;
      }
    }
  }
  return base;
}


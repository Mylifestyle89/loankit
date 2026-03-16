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
  const formulaKeys = new Set(formulaEntries.map(([k]) => k));

  // Topological sort: resolve formulas in dependency order
  // A formula depends on another if its expression references that formula's field key
  const deps = new Map<string, string[]>();
  for (const [fieldKey, formula] of formulaEntries) {
    const fieldDeps: string[] = [];
    for (const otherKey of formulaKeys) {
      if (otherKey !== fieldKey && formula.includes(otherKey)) {
        fieldDeps.push(otherKey);
      }
    }
    deps.set(fieldKey, fieldDeps);
  }

  // Kahn's algorithm for topological sort with cycle detection
  const inDegree = new Map<string, number>();
  for (const [k, d] of deps) inDegree.set(k, d.length);
  const queue: string[] = [];
  for (const [k, deg] of inDegree) { if (deg === 0) queue.push(k); }
  const sorted: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    for (const [k, d] of deps) {
      if (d.includes(node)) {
        const newDeg = (inDegree.get(k) ?? 0) - 1;
        inDegree.set(k, newDeg);
        if (newDeg === 0) queue.push(k);
      }
    }
  }
  // Append any remaining (cyclic) formulas at the end — they'll evaluate with whatever is available
  for (const [fieldKey] of formulaEntries) {
    if (!sorted.includes(fieldKey)) {
      console.warn(`[formula-processor] Circular dependency detected for: ${fieldKey}`);
      sorted.push(fieldKey);
    }
  }

  const formulaMap = new Map(formulaEntries);
  for (const fieldKey of sorted) {
    const formula = formulaMap.get(fieldKey)!;
    const fieldType = fieldTypeMap.get(fieldKey) ?? "text";
    const v = evaluateFieldFormula(formula, base, fieldType);
    if (v !== null) {
      base[fieldKey] = v;
      const labelVi = labelMap.get(fieldKey);
      if (labelVi) base[labelVi] = v;
    }
  }
  return base;
}


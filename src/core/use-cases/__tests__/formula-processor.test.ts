import { describe, it, expect } from "vitest";
import { computeEffectiveValues } from "../formula-processor";
import type { FieldCatalogItem } from "@/lib/report/config-schema";

const makeField = (field_key: string, type: FieldCatalogItem["type"] = "number"): FieldCatalogItem => ({
  field_key,
  label_vi: field_key,
  group: "Test",
  type,
  required: false,
  examples: [],
});

describe("computeEffectiveValues", () => {
  it("returns base values unchanged when no formulas", () => {
    const result = computeEffectiveValues({
      values: { doanh_thu: 1000, chi_phi: 200 },
      formulas: {},
      fieldCatalog: [makeField("doanh_thu"), makeField("chi_phi")],
    });
    expect(result.doanh_thu).toBe(1000);
    expect(result.chi_phi).toBe(200);
  });

  it("evaluates simple arithmetic formula", () => {
    const result = computeEffectiveValues({
      values: { doanh_thu: 1000, chi_phi: 200 },
      formulas: { loi_nhuan: "doanh_thu - chi_phi" },
      fieldCatalog: [
        makeField("doanh_thu"),
        makeField("chi_phi"),
        makeField("loi_nhuan"),
      ],
    });
    expect(result.loi_nhuan).toBe(800);
  });

  it("formula result overrides existing value", () => {
    const result = computeEffectiveValues({
      values: { a: 5, b: 3, c: 999 },
      formulas: { c: "a + b" },
      fieldCatalog: [makeField("a"), makeField("b"), makeField("c")],
    });
    expect(result.c).toBe(8);
  });

  it("base values not affected by formulas for other fields", () => {
    const result = computeEffectiveValues({
      values: { a: 10, b: 20 },
      formulas: { b: "a * 2" },
      fieldCatalog: [makeField("a"), makeField("b")],
    });
    expect(result.a).toBe(10);
    expect(result.b).toBe(20);
  });

  it("handles missing fieldCatalog entry (falls back to 'text' type)", () => {
    // Field 'x' not in catalog — should use default type 'text'
    const result = computeEffectiveValues({
      values: { a: 5 },
      formulas: { x: "a + 1" },
      fieldCatalog: [makeField("a")],
    });
    // evaluateFieldFormula with unknown type should not throw
    expect(result).toBeDefined();
  });

  it("returns empty object when given empty inputs", () => {
    const result = computeEffectiveValues({
      values: {},
      formulas: {},
      fieldCatalog: [],
    });
    expect(result).toEqual({});
  });
});

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

  it("sums repeater group field values", () => {
    const result = computeEffectiveValues({
      values: {
        "tài sản bảo đảm": [
          { "giá trị tsbđ": 5000000 },
          { "giá trị tsbđ": 3000000 },
          { "giá trị tsbđ": 2000000 },
        ],
      },
      formulas: {
        "tổng giá trị": "sum(giá trị tsbđ)",
      },
      fieldCatalog: [
        {
          field_key: "giá trị tsbđ",
          label_vi: "Giá trị tài sản bảo đảm",
          group: "tài sản bảo đảm",
          type: "number",
          required: false,
          is_repeater: false,
          examples: [],
        },
        {
          field_key: "tài sản bảo đảm",
          label_vi: "Tài sản bảo đảm",
          group: "Tài sản",
          type: "table",
          required: false,
          is_repeater: true,
          examples: [],
        },
        {
          field_key: "tổng giá trị",
          label_vi: "Tổng giá trị",
          group: "Tổng hợp",
          type: "number",
          required: false,
          examples: [],
        },
      ],
    });
    expect(result["tổng giá trị"]).toBe(10000000);
  });

  it("sums repeater with dotted field_key and all is_repeater=true", () => {
    const result = computeEffectiveValues({
      values: {
        "custom.tai_san_bao_dam_bat_dong_san": [
          { "custom.tai_san_bao_dam_bat_dong_san.gia_tri": 6015150000 },
          { "custom.tai_san_bao_dam_bat_dong_san.gia_tri": 5000000000 },
        ],
      },
      formulas: {
        "tong_gia_tri_tsbđ": "sum(custom.tai_san_bao_dam_bat_dong_san.gia_tri)",
      },
      fieldCatalog: [
        {
          field_key: "custom.tai_san_bao_dam_bat_dong_san.gia_tri",
          label_vi: "Giá trị tài sản bảo đảm",
          group: "custom.tai_san_bao_dam_bat_dong_san",
          type: "number",
          required: false,
          is_repeater: true,
          examples: [],
        },
        {
          field_key: "custom.tai_san_bao_dam_bat_dong_san.stt",
          label_vi: "STT",
          group: "custom.tai_san_bao_dam_bat_dong_san",
          type: "number",
          required: false,
          is_repeater: true,
          examples: [],
        },
        {
          field_key: "tong_gia_tri_tsbđ",
          label_vi: "Tổng giá trị TSBĐ",
          group: "Tổng hợp",
          type: "number",
          required: false,
          examples: [],
        },
      ],
    });
    expect(result["tong_gia_tri_tsbđ"]).toBe(11015150000);
  });

  it("sums repeater field with label_vi in formula", () => {
    const result = computeEffectiveValues({
      values: {
        "tài sản bảo đảm": [
          { "giá trị tsbđ": 5000000 },
          { "giá trị tsbđ": 3000000 },
        ],
      },
      formulas: {
        "tổng giá trị": "sum(Giá trị tài sản bảo đảm)",
      },
      fieldCatalog: [
        {
          field_key: "giá trị tsbđ",
          label_vi: "Giá trị tài sản bảo đảm",
          group: "tài sản bảo đảm",
          type: "number",
          required: false,
          is_repeater: false,
          examples: [],
        },
        {
          field_key: "tài sản bảo đảm",
          label_vi: "Tài sản bảo đảm",
          group: "Tài sản",
          type: "table",
          required: false,
          is_repeater: true,
          examples: [],
        },
        {
          field_key: "tổng giá trị",
          label_vi: "Tổng giá trị",
          group: "Tổng hợp",
          type: "number",
          required: false,
          examples: [],
        },
      ],
    });
    expect(result["tổng giá trị"]).toBe(8000000);
  });

  it("chained formula: sum → docsocodonvi via label_vi", () => {
    const result = computeEffectiveValues({
      values: {
        "tài sản bảo đảm": [
          { "giá trị tsbđ": 5000000 },
          { "giá trị tsbđ": 3000000 },
        ],
      },
      formulas: {
        "tổng giá trị": "sum(giá trị tsbđ)",
        "bằng chữ": 'docsocodonvi(Tổng giá trị,"đồng")',
      },
      fieldCatalog: [
        {
          field_key: "giá trị tsbđ",
          label_vi: "Giá trị tài sản bảo đảm",
          group: "tài sản bảo đảm",
          type: "number",
          required: false,
          is_repeater: false,
          examples: [],
        },
        {
          field_key: "tài sản bảo đảm",
          label_vi: "Tài sản bảo đảm",
          group: "Tài sản",
          type: "table",
          required: false,
          is_repeater: true,
          examples: [],
        },
        {
          field_key: "tổng giá trị",
          label_vi: "Tổng giá trị",
          group: "Tổng hợp",
          type: "number",
          required: false,
          examples: [],
        },
        {
          field_key: "bằng chữ",
          label_vi: "Bằng chữ",
          group: "Tổng hợp",
          type: "text",
          required: false,
          examples: [],
        },
      ],
    });
    expect(result["tổng giá trị"]).toBe(8000000);
    expect(result["bằng chữ"]).toBe("tám triệu đồng");
  });

  it("reverse-order formulas: docsocodonvi before sum (2-pass resolves dependency)", () => {
    const result = computeEffectiveValues({
      values: {
        "tài sản bảo đảm": [
          { "giá trị tsbđ": 5000000 },
          { "giá trị tsbđ": 3000000 },
        ],
      },
      formulas: {
        // docsocodonvi comes BEFORE sum — would fail without 2-pass
        "bằng chữ": 'docsocodonvi(Tổng giá trị,"đồng")',
        "tổng giá trị": "sum(giá trị tsbđ)",
      },
      fieldCatalog: [
        {
          field_key: "giá trị tsbđ",
          label_vi: "Giá trị tài sản bảo đảm",
          group: "tài sản bảo đảm",
          type: "number",
          required: false,
          is_repeater: false,
          examples: [],
        },
        {
          field_key: "tài sản bảo đảm",
          label_vi: "Tài sản bảo đảm",
          group: "Tài sản",
          type: "table",
          required: false,
          is_repeater: true,
          examples: [],
        },
        {
          field_key: "tổng giá trị",
          label_vi: "Tổng giá trị",
          group: "Tổng hợp",
          type: "number",
          required: false,
          examples: [],
        },
        {
          field_key: "bằng chữ",
          label_vi: "Bằng chữ",
          group: "Tổng hợp",
          type: "text",
          required: false,
          examples: [],
        },
      ],
    });
    expect(result["tổng giá trị"]).toBe(8000000);
    expect(result["bằng chữ"]).toBe("tám triệu đồng");
  });

  it("docsocodonvi with direct scalar value (no chaining)", () => {
    const result = computeEffectiveValues({
      values: { tong_gia_tri: 5000000 },
      formulas: {
        bang_chu: 'docsocodonvi(Tổng giá trị,"đồng")',
      },
      fieldCatalog: [
        {
          field_key: "tong_gia_tri",
          label_vi: "Tổng giá trị",
          group: "Tổng hợp",
          type: "number",
          required: false,
          examples: [],
        },
        {
          field_key: "bang_chu",
          label_vi: "Bằng chữ",
          group: "Tổng hợp",
          type: "text",
          required: false,
          examples: [],
        },
      ],
    });
    expect(result["bang_chu"]).toBe("năm triệu đồng");
  });
});

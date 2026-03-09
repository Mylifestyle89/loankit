import { describe, it, expect } from "vitest";
import { applyAiSuggestion } from "../apply-ai-suggestion";

const baseMappingText = JSON.stringify({
  version: "1.0.0",
  mappings: [
    { template_field: "ten_khach_hang", sources: [] },
    { template_field: "dia_chi", sources: [] },
    { template_field: "ma_so_thue", sources: [] },
  ],
});

describe("applyAiSuggestion", () => {
  it("applies matching suggestion correctly", () => {
    const result = applyAiSuggestion(baseMappingText, {
      suggestion: { ten_khach_hang: "Customer Name" },
    });
    expect(result.matched).toBe(1);
    const parsed = JSON.parse(result.nextMappingText);
    expect(parsed.mappings[0].sources).toEqual([
      { source: "excel_ai", path: "Customer Name", note: "AI suggestion accepted" },
    ]);
  });

  it("matches multiple suggestions at once", () => {
    const result = applyAiSuggestion(baseMappingText, {
      suggestion: {
        ten_khach_hang: "Customer Name",
        dia_chi: "Address",
      },
    });
    expect(result.matched).toBe(2);
    const parsed = JSON.parse(result.nextMappingText);
    expect(parsed.mappings[1].sources[0].path).toBe("Address");
  });

  it("returns 0 matched when no suggestions match any field", () => {
    const result = applyAiSuggestion(baseMappingText, {
      suggestion: { truong_khong_ton_tai: "Column A" },
    });
    expect(result.matched).toBe(0);
    const parsed = JSON.parse(result.nextMappingText);
    // Existing sources remain unchanged (empty arrays)
    expect(parsed.mappings[0].sources).toEqual([]);
  });

  it("preserves unmatched fields as-is", () => {
    const result = applyAiSuggestion(baseMappingText, {
      suggestion: { ten_khach_hang: "Customer Name" },
    });
    const parsed = JSON.parse(result.nextMappingText);
    // dia_chi and ma_so_thue are not in suggestion → unchanged
    expect(parsed.mappings[1].sources).toEqual([]);
    expect(parsed.mappings[2].sources).toEqual([]);
  });

  it("preserves top-level mapping properties (version, etc.)", () => {
    const result = applyAiSuggestion(baseMappingText, { suggestion: {} });
    const parsed = JSON.parse(result.nextMappingText);
    expect(parsed.version).toBe("1.0.0");
  });

  it("throws SyntaxError on invalid JSON input", () => {
    expect(() =>
      applyAiSuggestion("not valid json", { suggestion: {} })
    ).toThrow(SyntaxError);
  });

  it("handles empty mappings array gracefully", () => {
    const emptyMapping = JSON.stringify({ mappings: [] });
    const result = applyAiSuggestion(emptyMapping, {
      suggestion: { ten_khach_hang: "Customer Name" },
    });
    expect(result.matched).toBe(0);
    expect(JSON.parse(result.nextMappingText).mappings).toEqual([]);
  });

  it("handles missing mappings key gracefully", () => {
    const noMappings = JSON.stringify({ version: "1.0.0" });
    const result = applyAiSuggestion(noMappings, {
      suggestion: { ten_khach_hang: "Customer Name" },
    });
    expect(result.matched).toBe(0);
  });

  it("trims whitespace from template_field before matching", () => {
    const spacedMapping = JSON.stringify({
      mappings: [{ template_field: "  ten_khach_hang  ", sources: [] }],
    });
    const result = applyAiSuggestion(spacedMapping, {
      suggestion: { ten_khach_hang: "Customer Name" },
    });
    expect(result.matched).toBe(1);
  });
});

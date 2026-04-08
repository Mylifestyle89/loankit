// Regression tests for template-parser placeholder extraction (C2).

import { describe, it, expect } from "vitest";
import { extractPlaceholdersFromXml } from "../template-parser";

function wp(text: string): string {
  // Build a minimal <w:p>...<w:t>...</w:t></w:p> wrapper.
  return `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
}

describe("extractPlaceholdersFromXml", () => {
  it("finds a single placeholder in one paragraph", () => {
    const xml = wp("Xin chào [Tên khách hàng] kính mến");
    expect(extractPlaceholdersFromXml(xml)).toEqual(["Tên khách hàng"]);
  });

  it("catches split-run placeholder within the same paragraph", () => {
    // Word splits "[Số tiền]" across two runs sharing a paragraph.
    const xml = `<w:p><w:r><w:t>Số vay: [Số</w:t></w:r><w:r><w:t> tiền]</w:t></w:r></w:p>`;
    expect(extractPlaceholdersFromXml(xml)).toEqual(["Số tiền"]);
  });

  it("does NOT create a cross-paragraph false placeholder (C2 regression)", () => {
    // Paragraph 1 has a stray `[` and paragraph 2 has a stray `]`.
    // Previous implementation joined all <w:t> across the entire XML part and
    // matched `[ ... ]` spanning arbitrary intermediate text.
    const xml = `${wp("Mở ngoặc lẻ [ không đóng ở đây")}${wp("Đóng ngoặc lẻ ] không mở ở đây")}`;
    expect(extractPlaceholdersFromXml(xml)).toEqual([]);
  });

  it("keeps legitimate placeholders from multiple paragraphs", () => {
    const xml = `${wp("Dòng 1: [Họ tên]")}${wp("Dòng 2: [CCCD]")}`;
    expect(extractPlaceholdersFromXml(xml).sort()).toEqual(["CCCD", "Họ tên"]);
  });

  it("decodes XML entities inside placeholders", () => {
    const xml = wp("Giá trị [M&amp;A ghi chú]");
    expect(extractPlaceholdersFromXml(xml)).toEqual(["M&A ghi chú"]);
  });

  it("ignores text outside of <w:p> blocks", () => {
    const xml = `<w:sectPr><w:t>[không phải placeholder]</w:t></w:sectPr>${wp("[Thật]")}`;
    expect(extractPlaceholdersFromXml(xml)).toEqual(["Thật"]);
  });
});

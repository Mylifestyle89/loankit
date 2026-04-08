// Regression tests for mergeAdjacentRuns split-placeholder merging (I1).

import { describe, it, expect } from "vitest";
import { mergeAdjacentRuns } from "../docx-engine-helpers";

function run(text: string): string {
  return `<w:r><w:t>${text}</w:t></w:r>`;
}

function paragraph(...runs: string[]): string {
  return `<w:p>${runs.join("")}</w:p>`;
}

describe("mergeAdjacentRuns", () => {
  it("merges a placeholder split across two runs into the first <w:t>", () => {
    // [Số tiền] split as "[Số" + " tiền]"
    const xml = paragraph(run("[Số"), run(" tiền]"));
    const merged = mergeAdjacentRuns(xml);
    // First <w:t> must now contain the whole bracket expression.
    expect(merged).toContain("[Số tiền]");
    // Second <w:t> must be emptied.
    expect(merged).toMatch(/<w:t(?:\s[^>]*)?><\/w:t>/);
  });

  it("merges a placeholder split across three runs", () => {
    const xml = paragraph(run("[Địa"), run(" chỉ khách "), run("hàng]"));
    const merged = mergeAdjacentRuns(xml);
    expect(merged).toContain("[Địa chỉ khách hàng]");
  });

  it("handles two separate placeholders back-to-back (I1 regression)", () => {
    // Two placeholders split-run right next to each other — the outer loop
    // must not re-scan runs already consumed by the previous merge.
    const xml = paragraph(run("[A"), run("1] giữa ["), run("B2]"));
    const merged = mergeAdjacentRuns(xml);
    expect(merged).toContain("[A1]");
    expect(merged).toContain("[B2]");
  });

  it("leaves paragraphs without brackets untouched", () => {
    const xml = paragraph(run("Không có ngoặc"), run(" gì cả"));
    expect(mergeAdjacentRuns(xml)).toBe(xml);
  });

  it("does not cross paragraph boundaries", () => {
    // `[A` opens in paragraph 1, `B]` closes in paragraph 2 — must NOT merge.
    const xml = paragraph(run("[A")) + paragraph(run("B]"));
    const merged = mergeAdjacentRuns(xml);
    // Output should still have the broken bracket in the first paragraph.
    expect(merged).toContain("<w:p><w:r><w:t>[A</w:t></w:r></w:p>");
  });
});

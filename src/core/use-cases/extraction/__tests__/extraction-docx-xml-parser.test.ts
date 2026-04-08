// Regression tests for the nested-table walker (C5).

import { describe, it, expect } from "vitest";
import { findTopLevelTables } from "../extraction-docx-xml-parser";

function tbl(inner: string): string {
  return `<w:tbl><w:tblPr/><w:tblGrid/>${inner}</w:tbl>`;
}

function tr(cells: string): string {
  return `<w:tr>${cells}</w:tr>`;
}

function tc(text: string): string {
  return `<w:tc><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:tc>`;
}

describe("findTopLevelTables", () => {
  it("returns one result for a flat table", () => {
    const xml = tbl(tr(tc("A") + tc("B")) + tr(tc("1") + tc("2")));
    expect(findTopLevelTables(xml)).toHaveLength(1);
  });

  it("returns 2 top-level tables when they are siblings", () => {
    const xml = tbl(tr(tc("A"))) + "<w:p/>" + tbl(tr(tc("B")));
    expect(findTopLevelTables(xml)).toHaveLength(2);
  });

  it("treats a nested table as part of its outer, not as a top-level entry (C5 regression)", () => {
    // Outer table has an inner table inside one of its cells.
    const innerTable = tbl(tr(tc("inner-1")) + tr(tc("inner-2")));
    const outer = tbl(
      tr(tc("outer-h1") + tc("outer-h2")) +
        tr(`<w:tc>${innerTable}</w:tc>` + tc("outer-end")),
    );
    const result = findTopLevelTables(outer);
    // Non-greedy regex used to return 2 entries both cut at the first </w:tbl>,
    // losing the outer's trailing rows. Balanced walker must return exactly 1
    // top-level table whose XML contains the full outer (inner included).
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("outer-h1");
    expect(result[0]).toContain("outer-end");
    expect(result[0]).toContain("inner-1");
  });

  it("ignores <w:tblPr> and <w:tblGrid> (not real table opens)", () => {
    // Bare <w:tblPr> without a real <w:tbl> wrapper should produce nothing.
    const xml = "<w:p><w:tblPr/></w:p>";
    expect(findTopLevelTables(xml)).toEqual([]);
  });

  it("handles malformed XML (missing close) without throwing", () => {
    const xml = `<w:tbl><w:tr><w:tc>broken`;
    expect(() => findTopLevelTables(xml)).not.toThrow();
  });
});

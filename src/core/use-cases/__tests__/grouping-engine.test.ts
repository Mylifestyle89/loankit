import { describe, it, expect } from "vitest";
import { groupDataByField } from "../grouping-engine";

type Row = { company: string; year: string; revenue: number };

const rows: Row[] = [
  { company: "Công ty A", year: "2023", revenue: 100 },
  { company: "Công ty A", year: "2024", revenue: 150 },
  { company: "Công ty B", year: "2023", revenue: 200 },
  { company: "Công ty B", year: "2024", revenue: 250 },
];

describe("groupDataByField", () => {
  it("groups rows by groupKey correctly", () => {
    const result = groupDataByField(rows, "company", "items");
    expect(result).toHaveLength(2);
    const companyA = result.find((r) => r.company === "Công ty A");
    expect(companyA).toBeDefined();
    expect((companyA as Record<string, unknown>).items).toHaveLength(2);
  });

  it("each group contains all original rows for that key", () => {
    const result = groupDataByField(rows, "company", "items");
    const companyB = result.find((r) => r.company === "Công ty B");
    const items = (companyB as Record<string, unknown>).items as Row[];
    expect(items.map((r) => r.year)).toEqual(["2023", "2024"]);
  });

  it("preserves parent-level fields from first row", () => {
    const result = groupDataByField(rows, "company", "details");
    const companyA = result.find((r) => r.company === "Công ty A");
    expect(companyA?.year).toBe("2023");   // first row's year
    expect(companyA?.revenue).toBe(100);   // first row's revenue
  });

  it("throws ValidationError when rows is not an array", () => {
    expect(() =>
      // @ts-expect-error intentional test of invalid input
      groupDataByField("not-an-array", "company", "items")
    ).toThrow("rows must be an array");
  });

  it("throws ValidationError when groupKey is empty", () => {
    expect(() => groupDataByField(rows, "", "items")).toThrow("groupKey is required");
  });

  it("throws ValidationError when repeatKey is empty", () => {
    expect(() => groupDataByField(rows, "company", "")).toThrow("repeatKey is required");
  });

  it("skips rows with missing groupKey value", () => {
    const rowsWithMissing = [
      { company: "Công ty A", value: 1 },
      { company: "", value: 2 },         // empty string → skipped
      { company: undefined, value: 3 },  // undefined → skipped
    ];
    const result = groupDataByField(rowsWithMissing, "company", "items");
    expect(result).toHaveLength(1);
    expect(result[0].company).toBe("Công ty A");
  });

  it("handles single-row input", () => {
    const single = [{ id: "1", name: "Test" }];
    const result = groupDataByField(single, "id", "rows");
    expect(result).toHaveLength(1);
    expect((result[0] as Record<string, unknown>).rows).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    const result = groupDataByField([], "company", "items");
    expect(result).toEqual([]);
  });
});

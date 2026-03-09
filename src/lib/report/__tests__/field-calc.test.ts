import { describe, it, expect } from "vitest";
import {
  toNumber,
  toNumberOrZero,
  extractNumbers,
  sum,
  average,
  min,
  max,
} from "../field-calc";

describe("toNumber", () => {
  it("parses integer string", () => expect(toNumber("1234")).toBe(1234));
  // Vietnamese format: "," = decimal, "." = thousands separator
  it("parses decimal using Vietnamese comma format", () => expect(toNumber("12,5")).toBe(12.5));
  it("treats dot as thousands separator — not decimal", () => expect(toNumber("12.5")).toBe(125));
  it("parses Vietnamese format (dots as thousands, comma as decimal)", () => {
    expect(toNumber("1.234.567,89")).toBe(1234567.89);
  });
  it("parses negative number", () => expect(toNumber("-500")).toBe(-500));
  it("returns the number itself if already a number", () => expect(toNumber(42)).toBe(42));
  it("returns null for null", () => expect(toNumber(null)).toBeNull());
  it("returns null for undefined", () => expect(toNumber(undefined)).toBeNull());
  it("returns null for empty string", () => expect(toNumber("")).toBeNull());
  it("returns null for non-numeric string", () => expect(toNumber("abc")).toBeNull());
  it("returns null for NaN", () => expect(toNumber(NaN)).toBeNull());
  it("returns null for Infinity", () => expect(toNumber(Infinity)).toBeNull());
  it("handles whitespace-only string", () => expect(toNumber("   ")).toBeNull());
});

describe("toNumberOrZero", () => {
  it("returns 0 for null", () => expect(toNumberOrZero(null)).toBe(0));
  it("returns 0 for invalid string", () => expect(toNumberOrZero("xyz")).toBe(0));
  it("returns actual number when valid", () => expect(toNumberOrZero("500")).toBe(500));
});

describe("extractNumbers", () => {
  it("filters out non-numeric values", () => {
    // "3,5" is VN decimal format → 3.5; "3.5" treats dot as thousands → 35
    expect(extractNumbers([1, "abc", null, 2, undefined, "3,5"])).toEqual([1, 2, 3.5]);
  });
  it("returns empty for all-invalid input", () => {
    expect(extractNumbers(["a", null, undefined])).toEqual([]);
  });
  it("returns empty for empty array", () => {
    expect(extractNumbers([])).toEqual([]);
  });
});

describe("sum", () => {
  it("sums numeric values", () => expect(sum([1, 2, 3])).toBe(6));
  it("ignores non-numeric values", () => expect(sum([1, "bad", null, 2])).toBe(3));
  it("returns 0 for empty array", () => expect(sum([])).toBe(0));
  it("handles Vietnamese number strings", () => expect(sum(["1.000", "2.000"])).toBe(3000));
});

describe("average", () => {
  it("calculates correct average", () => expect(average([10, 20, 30])).toBe(20));
  it("returns 0 for empty array", () => expect(average([])).toBe(0));
  it("ignores non-numeric values", () => expect(average([10, "bad", 20])).toBe(15));
});

describe("min / max", () => {
  it("returns min correctly", () => expect(min([3, 1, 4, 1, 5])).toBe(1));
  it("returns max correctly", () => expect(max([3, 1, 4, 1, 5])).toBe(5));
  it("returns null for empty array", () => {
    expect(min([])).toBeNull();
    expect(max([])).toBeNull();
  });
  it("handles negative numbers", () => {
    expect(min([-5, -1, -10])).toBe(-10);
    expect(max([-5, -1, -10])).toBe(-1);
  });
});

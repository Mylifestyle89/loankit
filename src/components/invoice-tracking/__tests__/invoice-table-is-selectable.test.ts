import { describe, it, expect } from "vitest";
import { isSelectable } from "../invoice-table";

describe("isSelectable", () => {
  it("returns true for pending invoice", () => {
    expect(isSelectable({ id: "inv-1", status: "pending" })).toBe(true);
  });

  it("returns true for overdue invoice", () => {
    expect(isSelectable({ id: "inv-2", status: "overdue" })).toBe(true);
  });

  it("returns false for paid invoice", () => {
    expect(isSelectable({ id: "inv-3", status: "paid" })).toBe(false);
  });

  it("returns false for needs_supplement invoice", () => {
    expect(isSelectable({ id: "inv-4", status: "needs_supplement" })).toBe(false);
  });

  it("returns false for virtual entry (pending)", () => {
    expect(isSelectable({ id: "virtual-abc", status: "pending" })).toBe(false);
  });

  it("returns false for virtual entry (overdue)", () => {
    expect(isSelectable({ id: "virtual-xyz", status: "overdue" })).toBe(false);
  });
});

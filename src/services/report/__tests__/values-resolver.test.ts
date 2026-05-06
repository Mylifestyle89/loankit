/**
 * values-resolver tests — DB-only loader (Phase 5a closed the dual-read window).
 *
 * Coverage:
 *   - loanId hit → returns DB values
 *   - loanId stale (NotFoundError) → graceful empty
 *   - loanId other DB error → propagates
 *   - null loanId → {}
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "@/core/errors/app-error";

vi.mock("../values.service", () => ({
  valuesService: { getMergedValuesForExport: vi.fn() },
}));

import { valuesService } from "../values.service";
import { resolveValuesForLoan } from "../values-resolver";

const mValues = valuesService as unknown as { getMergedValuesForExport: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveValuesForLoan", () => {
  it("loanId hit → returns DB values", async () => {
    mValues.getMergedValuesForExport.mockResolvedValueOnce({ ten_dn: "ABC" });
    expect(await resolveValuesForLoan("loan1")).toEqual({ ten_dn: "ABC" });
  });

  it("loanId + DB returns empty → returns {}", async () => {
    mValues.getMergedValuesForExport.mockResolvedValueOnce({});
    expect(await resolveValuesForLoan("loan1")).toEqual({});
  });

  it("loanId stale (NotFoundError) → graceful empty", async () => {
    mValues.getMergedValuesForExport.mockRejectedValueOnce(new NotFoundError("Loan stale not found."));
    expect(await resolveValuesForLoan("stale")).toEqual({});
  });

  it("loanId + DB other error → propagates", async () => {
    mValues.getMergedValuesForExport.mockRejectedValueOnce(new Error("DB down"));
    await expect(resolveValuesForLoan("loan1")).rejects.toThrow(/DB down/);
  });

  it("null loanId → {}", async () => {
    expect(await resolveValuesForLoan(null)).toEqual({});
    expect(mValues.getMergedValuesForExport).not.toHaveBeenCalled();
  });

  it("undefined loanId → {}", async () => {
    expect(await resolveValuesForLoan(undefined)).toEqual({});
  });
});

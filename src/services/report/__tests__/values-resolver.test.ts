/**
 * values-resolver tests — DB-first + FS-fallback loader.
 *
 * Coverage:
 *   - loanId provided + DB hit
 *   - loanId provided + DB throws NotFoundError → graceful empty
 *   - loanId null + flag on → FS fallback
 *   - loanId null + flag off → {}
 *   - DB other errors propagate
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "@/core/errors/app-error";

vi.mock("../values.service", () => ({
  valuesService: { getMergedValuesForExport: vi.fn() },
}));
vi.mock("@/lib/report/manual-values", () => ({
  loadManualValues: vi.fn(),
}));
vi.mock("@/lib/report/constants", async () => {
  const actual = await vi.importActual<typeof import("@/lib/report/constants")>("@/lib/report/constants");
  return { ...actual, isLegacyFallbackEnabled: vi.fn() };
});

import { isLegacyFallbackEnabled } from "@/lib/report/constants";
import { loadManualValues } from "@/lib/report/manual-values";
import { valuesService } from "../values.service";
import { resolveValuesForLoan } from "../values-resolver";

const mValues = valuesService as unknown as { getMergedValuesForExport: ReturnType<typeof vi.fn> };
const mLoadManual = loadManualValues as unknown as ReturnType<typeof vi.fn>;
const mFlag = isLegacyFallbackEnabled as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveValuesForLoan", () => {
  it("loanId hit → returns DB values, no FS read", async () => {
    mValues.getMergedValuesForExport.mockResolvedValueOnce({ ten_dn: "ABC" });
    expect(await resolveValuesForLoan("loan1")).toEqual({ ten_dn: "ABC" });
    expect(mLoadManual).not.toHaveBeenCalled();
  });

  it("loanId + DB returns empty → returns {} (NO FS leak)", async () => {
    mValues.getMergedValuesForExport.mockResolvedValueOnce({});
    mFlag.mockReturnValue(true); // even if flag on, do not leak global FS data into a loan
    expect(await resolveValuesForLoan("loan1")).toEqual({});
    expect(mLoadManual).not.toHaveBeenCalled();
  });

  it("loanId stale (NotFoundError) → graceful empty", async () => {
    mValues.getMergedValuesForExport.mockRejectedValueOnce(new NotFoundError("Loan stale not found."));
    expect(await resolveValuesForLoan("stale")).toEqual({});
  });

  it("loanId + DB other error → propagates", async () => {
    mValues.getMergedValuesForExport.mockRejectedValueOnce(new Error("DB down"));
    await expect(resolveValuesForLoan("loan1")).rejects.toThrow(/DB down/);
  });

  it("null loanId + flag on → FS fallback", async () => {
    mFlag.mockReturnValue(true);
    mLoadManual.mockResolvedValueOnce({ orphan: "data" });
    expect(await resolveValuesForLoan(null)).toEqual({ orphan: "data" });
    expect(mValues.getMergedValuesForExport).not.toHaveBeenCalled();
  });

  it("null loanId + flag off → {}", async () => {
    mFlag.mockReturnValue(false);
    expect(await resolveValuesForLoan(null)).toEqual({});
    expect(mLoadManual).not.toHaveBeenCalled();
  });
});

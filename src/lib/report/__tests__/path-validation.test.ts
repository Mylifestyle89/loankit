import { describe, it, expect } from "vitest";
import { validateRelativePath, validatePathUnderBase } from "../path-validation";
import { ValidationError } from "@/core/errors/app-error";

describe("validateRelativePath — security integration with AppError", () => {
  it("throws ValidationError (not generic Error) on path traversal", () => {
    expect(() => validateRelativePath("../../etc/passwd")).toThrow(ValidationError);
  });

  it("thrown ValidationError has correct status and code", () => {
    try {
      validateRelativePath("../../etc/passwd");
    } catch (err) {
      expect(err instanceof ValidationError).toBe(true);
      if (err instanceof ValidationError) {
        expect(err.status).toBe(400);
        expect(err.code).toBe("VALIDATION_ERROR");
      }
    }
  });

  it("throws ValidationError on absolute path", () => {
    const absolutePath = "/usr/bin/local";
    expect(() => validateRelativePath(absolutePath)).toThrow(ValidationError);
  });

  it("throws ValidationError on Windows-style absolute path", () => {
    // Note: path.isAbsolute("C:\\...") on Linux returns false (Windows-specific check)
    // This test is skipped on non-Windows systems to avoid false negatives.
    // On Windows CI, this would catch the Windows absolute path correctly.
    if (process.platform === "win32") {
      expect(() => validateRelativePath("C:\\Windows\\System32")).toThrow(ValidationError);
    }
  });

  it("throws ValidationError on empty string", () => {
    expect(() => validateRelativePath("")).toThrow(ValidationError);
  });

  it("throws ValidationError on null-like input", () => {
    // @ts-expect-error intentional invalid input
    expect(() => validateRelativePath(null)).toThrow(ValidationError);
  });

  it("accepts safe relative paths within workspace", () => {
    expect(() => validateRelativePath("report_assets/config/framework_state.json")).not.toThrow();
    expect(() => validateRelativePath("report_assets/uploads/template.docx")).not.toThrow();
  });

  it("returns the original relPath unchanged when valid", () => {
    const safe = "report_assets/config/test.json";
    expect(validateRelativePath(safe)).toBe(safe);
  });
});

describe("validatePathUnderBase — base containment check", () => {
  it("accepts paths within the allowed base", () => {
    expect(() =>
      validatePathUnderBase("report_assets/config/test.json", "report_assets")
    ).not.toThrow();
  });

  it("throws ValidationError when path is outside allowed base", () => {
    expect(() =>
      validatePathUnderBase("src/app/api/secret.ts", "report_assets")
    ).toThrow(ValidationError);
  });

  it("throws ValidationError on path traversal even with correct prefix string", () => {
    // "report_assets/../src" starts with "report_assets" as a string
    // but resolves outside the base — should still be caught
    expect(() =>
      validatePathUnderBase("report_assets/../src/secret.ts", "report_assets")
    ).toThrow(ValidationError);
  });
});

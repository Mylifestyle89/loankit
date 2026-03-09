import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  SystemError,
  OcrProcessError,
  AiMappingTimeoutError,
  toHttpError,
} from "../app-error";

describe("AppError subclasses", () => {
  it("ValidationError has correct status and code", () => {
    const err = new ValidationError("bad input");
    expect(err.status).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("bad input");
    expect(err instanceof AppError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it("NotFoundError has correct status and code", () => {
    const err = new NotFoundError("not found");
    expect(err.status).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
  });

  it("ConflictError has correct status and code", () => {
    const err = new ConflictError("conflict");
    expect(err.status).toBe(409);
    expect(err.code).toBe("CONFLICT");
  });

  it("SystemError has correct status and code", () => {
    const err = new SystemError("crash");
    expect(err.status).toBe(500);
    expect(err.code).toBe("SYSTEM_ERROR");
  });

  it("OcrProcessError has correct status and code", () => {
    const err = new OcrProcessError("ocr failed");
    expect(err.status).toBe(500);
    expect(err.code).toBe("OCR_PROCESS_ERROR");
  });

  it("AiMappingTimeoutError has correct status and code", () => {
    const err = new AiMappingTimeoutError("timeout");
    expect(err.status).toBe(504);
    expect(err.code).toBe("AI_MAPPING_TIMEOUT");
  });

  it("AppError carries optional details", () => {
    const err = new ValidationError("err", { field: "name" });
    expect(err.details).toEqual({ field: "name" });
  });
});

describe("toHttpError", () => {
  it("maps AppError to correct status and message", () => {
    const err = new ValidationError("invalid field");
    const result = toHttpError(err, "fallback");
    expect(result.status).toBe(400);
    expect(result.message).toBe("invalid field");
  });

  it("maps plain Error to status 500 with fallback (security: no raw leak)", () => {
    const err = new Error("something broke");
    const result = toHttpError(err, "fallback");
    expect(result.status).toBe(500);
    expect(result.message).toBe("fallback");
  });

  it("uses fallback message for non-Error unknowns", () => {
    const result = toHttpError("some string error", "fallback message");
    expect(result.status).toBe(500);
    expect(result.message).toBe("fallback message");
  });

  it("uses fallback message for null", () => {
    const result = toHttpError(null, "fallback");
    expect(result.status).toBe(500);
    expect(result.message).toBe("fallback");
  });

  it("propagates details from AppError", () => {
    const err = new ValidationError("err", { field: "email" });
    const result = toHttpError(err, "fallback");
    expect(result.details).toEqual({ field: "email" });
  });
});

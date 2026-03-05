export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, options: { code: string; status: number; details?: unknown }) {
    super(message);
    this.name = "AppError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { code: "VALIDATION_ERROR", status: 400, details });
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { code: "NOT_FOUND", status: 404, details });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { code: "CONFLICT", status: 409, details });
    this.name = "ConflictError";
  }
}

export class SystemError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { code: "SYSTEM_ERROR", status: 500, details });
    this.name = "SystemError";
  }
}

export class OcrProcessError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { code: "OCR_PROCESS_ERROR", status: 500, details });
    this.name = "OcrProcessError";
  }
}

export class AiMappingTimeoutError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { code: "AI_MAPPING_TIMEOUT", status: 504, details });
    this.name = "AiMappingTimeoutError";
  }
}

export function toHttpError(error: unknown, fallbackMessage: string): { status: number; message: string; details?: unknown } {
  if (error instanceof AppError) {
    return { status: error.status, message: error.message, details: error.details };
  }
  // SECURITY: do not expose raw Error.message to clients — it may contain
  // internal paths, stack traces, or sensitive information.
  // Log the real error server-side, return the safe fallback to the client.
  if (error instanceof Error) {
    console.error("[toHttpError] Unexpected error:", error.message);
  }
  return { status: 500, message: fallbackMessage };
}


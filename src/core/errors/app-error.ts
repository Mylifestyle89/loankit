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

export function toHttpError(error: unknown, fallbackMessage: string): { status: number; message: string; details?: unknown } {
  if (error instanceof AppError) {
    return { status: error.status, message: error.message, details: error.details };
  }
  if (error instanceof Error) {
    return { status: 500, message: error.message };
  }
  return { status: 500, message: fallbackMessage };
}


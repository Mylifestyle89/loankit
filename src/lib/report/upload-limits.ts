import { ValidationError } from "@/core/errors/app-error";

/**
 * Centralized file upload limits.
 * Maps file categories to their allowed MIME types and max size.
 */

type UploadCategory = "ocr" | "docx" | "generic_data" | "generic_template";

type UploadRule = {
  maxBytes: number;
  allowedMimeTypes: Set<string>;
  label: string;
};

const UPLOAD_RULES: Record<UploadCategory, UploadRule> = {
  ocr: {
    maxBytes: 20 * 1024 * 1024, // 20 MB
    allowedMimeTypes: new Set([
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "application/pdf",
    ]),
    label: "OCR (ảnh/PDF)",
  },
  docx: {
    maxBytes: 50 * 1024 * 1024, // 50 MB
    allowedMimeTypes: new Set([
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/octet-stream", // fallback when browser doesn't detect MIME
    ]),
    label: "DOCX",
  },
  generic_data: {
    maxBytes: 50 * 1024 * 1024, // 50 MB
    allowedMimeTypes: new Set([
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/json",
      "text/markdown",
      "text/plain",
      "application/octet-stream",
    ]),
    label: "Dữ liệu (CSV/Excel/JSON/MD)",
  },
  generic_template: {
    maxBytes: 50 * 1024 * 1024, // 50 MB
    allowedMimeTypes: new Set([
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/octet-stream",
    ]),
    label: "Template (DOCX/DOC)",
  },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate a file against the rules for a given upload category.
 * Checks both file size and MIME type in a single call.
 * Throws ValidationError if any check fails.
 */
export function validateUploadFile(file: File, category: UploadCategory): void {
  const rule = UPLOAD_RULES[category];

  if (file.size > rule.maxBytes) {
    throw new ValidationError(
      `File quá lớn (${formatFileSize(file.size)}). Giới hạn cho ${rule.label}: ${formatFileSize(rule.maxBytes)}.`,
    );
  }

  const mime = (file.type || "application/octet-stream").toLowerCase();
  if (!rule.allowedMimeTypes.has(mime)) {
    throw new ValidationError(
      `Loại file không hỗ trợ: ${file.type || "(trống)"}. Cho phép: ${rule.label}.`,
    );
  }
}

/**
 * Validate file size only (for routes that already handle MIME checks separately).
 */
export function validateFileSize(file: File, category: UploadCategory): void {
  const rule = UPLOAD_RULES[category];
  if (file.size > rule.maxBytes) {
    throw new ValidationError(
      `File quá lớn (${formatFileSize(file.size)}). Giới hạn: ${formatFileSize(rule.maxBytes)}.`,
    );
  }
}

export { UPLOAD_RULES, type UploadCategory };

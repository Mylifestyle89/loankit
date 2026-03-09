import path from "node:path";

import { ValidationError } from "@/core/errors/app-error";

/** Relative base directory for report assets — use with validatePathUnderBase. */
export const REPORT_ASSETS_BASE = "report_assets";

/**
 * Validates that a relative path is safe to use for file operations.
 *
 * Uses path.relative() for OS-agnostic containment check — avoids string
 * manipulation edge cases on Windows vs. Unix separators.
 *
 * Throws ValidationError if:
 * - Path is absolute
 * - Resolved path escapes the workspace root (path traversal)
 *
 * Returns the path as-is (callers should join with process.cwd() after validation).
 */
export function validateRelativePath(relPath: string): string {
  if (!relPath || typeof relPath !== "string") {
    throw new ValidationError("Path không hợp lệ.");
  }

  if (path.isAbsolute(relPath)) {
    throw new ValidationError("Path tuyệt đối không được phép. Chỉ sử dụng đường dẫn tương đối.");
  }

  const workspaceRoot = path.resolve(process.cwd());
  const resolved = path.resolve(workspaceRoot, relPath);
  const relative = path.relative(workspaceRoot, resolved);

  // If path.relative starts with ".." or is absolute, the resolved path
  // is outside the workspace root — regardless of OS separator format.
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new ValidationError("Path traversal không được phép.");
  }

  return relPath;
}

/**
 * Same as validateRelativePath but additionally enforces the path
 * must sit under an allowed subdirectory (e.g. "report_assets/").
 *
 * Resolves both paths to absolute before comparing, so separator
 * differences on Windows are handled correctly.
 */
export function validatePathUnderBase(relPath: string, allowedBase: string): string {
  validateRelativePath(relPath);

  const workspaceRoot = path.resolve(process.cwd());
  const resolvedPath = path.resolve(workspaceRoot, relPath);
  const resolvedBase = path.resolve(workspaceRoot, allowedBase);
  const relative = path.relative(resolvedBase, resolvedPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new ValidationError(
      `Path phải nằm trong thư mục '${allowedBase}'. Path không hợp lệ: ${relPath}`,
    );
  }

  return relPath;
}

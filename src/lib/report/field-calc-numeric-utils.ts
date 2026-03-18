/**
 * Numeric utility functions for field calculations.
 * Supports VN number format (1.234,56) and aggregate operations.
 */

// --- Chuyển giá trị raw sang number (hỗ trợ format VN: 1.234,56) ---

export function toNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (cleaned === "") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toNumberOrZero(raw: unknown): number {
  const n = toNumber(raw);
  return n ?? 0;
}

// --- Hàm tổng hợp (dùng cho mảng giá trị / repeater) ---

/** Trích danh sách số từ mảng (bỏ null/undefined/không phải số). */
export function extractNumbers(values: unknown[]): number[] {
  const out: number[] = [];
  for (const v of values) {
    const n = toNumber(v);
    if (n !== null) out.push(n);
  }
  return out;
}

export function sum(values: unknown[]): number {
  return extractNumbers(values).reduce((a, b) => a + b, 0);
}

export function average(values: unknown[]): number {
  const nums = extractNumbers(values);
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function min(values: unknown[]): number | null {
  const nums = extractNumbers(values);
  if (nums.length === 0) return null;
  return Math.min(...nums);
}

export function max(values: unknown[]): number | null {
  const nums = extractNumbers(values);
  if (nums.length === 0) return null;
  return Math.max(...nums);
}

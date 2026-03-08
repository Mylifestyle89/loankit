/** Format number with thousand separators (vi-VN style: 1.000.000) */
export function fmtNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("vi-VN");
}

/** Parse formatted number back to raw digits */
export function parseNumber(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

/** Auto-format date input as dd/mm/yyyy while typing */
export function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Convert dd/mm/yyyy to yyyy-mm-dd (ISO) for API submission */
export function dmy2iso(dmy: string): string {
  const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Format number for display (read-only contexts) */
export const fmtDisplay = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

/** Format ISO date string to vi-VN locale display */
export const fmtDateDisplay = (d: string) => new Date(d).toLocaleDateString("vi-VN");

/** Convert ISO date string to dd/mm/yyyy display format */
export function isoToDisplay(isoOrStr: string | null | undefined): string {
  if (!isoOrStr) return "";
  try {
    const d = new Date(isoOrStr);
    if (isNaN(d.getTime())) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  } catch { return ""; }
}

/** Auto dueDate = date + 1 month (clamped to end of month to handle e.g. Jan 31 → Feb 28) */
export function addOneMonthClamped(date: Date): Date {
  const d = new Date(date);
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + 1);
  if (d.getDate() !== originalDay) d.setDate(0);
  return d;
}

/** Shared status values for loans and disbursements */
export const TRACKING_STATUSES = ["active", "completed", "cancelled"] as const;
export type TrackingStatus = (typeof TRACKING_STATUSES)[number];

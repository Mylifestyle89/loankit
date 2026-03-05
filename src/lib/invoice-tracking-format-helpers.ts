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

/** Shared status values for loans and disbursements */
export const TRACKING_STATUSES = ["active", "completed", "cancelled"] as const;
export type TrackingStatus = (typeof TRACKING_STATUSES)[number];

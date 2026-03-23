// Utility functions for loan plan editor — formatting and parsing

export function fmtVND(n: number): string {
  return n.toLocaleString("vi-VN") + "đ";
}

export function formatPercentInputFromRate(rate: number): string {
  if (!rate) return "";
  return String(rate * 100).replace(".", ",");
}

export function parsePercentInputToRate(raw: string): number {
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value / 100;
}

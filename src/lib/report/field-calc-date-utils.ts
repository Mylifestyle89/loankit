/**
 * Date utility functions for field calculations.
 * Supports: parsing, formatting, date arithmetic (add/subtract days/months/years), date diff.
 */

import { toNumber } from "./field-calc-numeric-utils";

export type DateUnit = "d" | "m" | "y";
export type ResolvedDateTerm =
  | { kind: "date"; value: Date }
  | { kind: "number"; value: number }
  | { kind: "duration"; value: { amount: number; unit: DateUnit } };

function toValidUtcDate(year: number, month: number, day: number): Date | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d;
}

export function parseDateLike(raw: unknown): Date | null {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return new Date(Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate()));
  }
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text) return null;

  // dd/mm/yyyy
  let m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    return toValidUtcDate(year, month, day);
  }

  // yyyy-mm-dd
  m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    return toValidUtcDate(year, month, day);
  }

  // dd-mm-yyyy
  m = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    return toValidUtcDate(year, month, day);
  }

  return null;
}

export function formatDateDdMmYyyy(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getUTCFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function daysInMonthUtc(year: number, monthOneBased: number): number {
  return new Date(Date.UTC(year, monthOneBased, 0)).getUTCDate();
}

function addMonthsClamped(date: Date, amount: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  const totalMonths = year * 12 + (month - 1) + amount;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonthOneBased = (totalMonths % 12 + 12) % 12 + 1;
  const targetDay = Math.min(day, daysInMonthUtc(targetYear, targetMonthOneBased));
  return new Date(Date.UTC(targetYear, targetMonthOneBased - 1, targetDay));
}

function addDateByUnit(date: Date, amount: number, unit: DateUnit): Date {
  if (unit === "d") {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + amount));
  }
  if (unit === "m") {
    return addMonthsClamped(date, amount);
  }
  // year
  return addMonthsClamped(date, amount * 12);
}

function dateDiffDays(left: Date, right: Date): number {
  const ms = left.getTime() - right.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function normalizeDateUnit(rawUnit: string): DateUnit | null {
  const unit = rawUnit.trim().toLowerCase();
  if (unit === "d" || unit === "day" || unit === "days" || unit === "ngay" || unit === "ngày") return "d";
  if (unit === "m" || unit === "month" || unit === "months" || unit === "thang" || unit === "tháng") return "m";
  if (unit === "y" || unit === "year" || unit === "years" || unit === "nam" || unit === "năm") return "y";
  return null;
}

function resolveDateTerm(rawTerm: string, context: Record<string, unknown>): ResolvedDateTerm | null {
  const term = rawTerm.trim();
  if (!term) return null;

  const fromContext = context[term] ?? context[term.replace(/_/g, " ")];
  if (fromContext !== undefined) {
    const d = parseDateLike(fromContext);
    if (d) return { kind: "date", value: d };
    const n = toNumber(fromContext);
    if (n !== null) return { kind: "number", value: n };
  }

  const literalDate = parseDateLike(term);
  if (literalDate) return { kind: "date", value: literalDate };

  const durationMatch = term.match(/^([+-]?\d+)\s*(d|day|days|ngay|ngày|m|month|months|thang|tháng|y|year|years|nam|năm)$/iu);
  if (durationMatch) {
    const amount = Number(durationMatch[1]);
    const unit = normalizeDateUnit(durationMatch[2]);
    if (unit) return { kind: "duration", value: { amount, unit } };
  }

  const n = toNumber(term);
  if (n !== null) return { kind: "number", value: n };

  return null;
}

/**
 * Date formula (chỉ + / -):
 * - date + 10d|2m|1y => date (dd/mm/yyyy)
 * - date - 10d|2m|1y => date (dd/mm/yyyy)
 * - date - date => số ngày
 */
export function evaluateDateExpression(
  expression: string,
  context: Record<string, unknown>,
): string | number | null {
  const expr = expression.trim();
  if (!expr) return null;
  if (expr.includes("*") || expr.includes("/")) return null;

  const parts = expr.split(/([+-])/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  let current = resolveDateTerm(parts[0], context);
  if (!current || current.kind === "duration") return null;

  for (let i = 1; i < parts.length; i += 2) {
    const op = parts[i];
    const rightRaw = parts[i + 1];
    if (!rightRaw || (op !== "+" && op !== "-")) return null;
    const right = resolveDateTerm(rightRaw, context);
    if (!right) return null;

    if (current.kind === "date") {
      if (right.kind === "duration") {
        const delta = op === "+" ? right.value.amount : -right.value.amount;
        current = {
          kind: "date",
          value: addDateByUnit(current.value, delta, right.value.unit),
        };
        continue;
      }
      if (right.kind === "date" && op === "-") {
        current = { kind: "number", value: dateDiffDays(current.value, right.value) };
        continue;
      }
      return null;
    }

    if (current.kind === "number" && right.kind === "number") {
      current = {
        kind: "number",
        value: op === "+" ? current.value + right.value : current.value - right.value,
      };
      continue;
    }

    return null;
  }

  if (current.kind === "date") return formatDateDdMmYyyy(current.value);
  return current.value;
}

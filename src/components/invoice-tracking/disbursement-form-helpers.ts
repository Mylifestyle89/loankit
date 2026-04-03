/**
 * disbursement-form-helpers.ts
 *
 * Pure helper functions and empty-line factories for DisbursementFormModal.
 */

import { dmy2iso } from "@/lib/invoice-tracking-format-helpers";
import type { BeneficiaryLine, InvoiceLine } from "./beneficiary-section-form";

// ─── ID generator ─────────────────────────────────────────────────────────────

let _tempId = 0;

/** Generate a unique temporary ID for beneficiary/invoice line items. */
export function tempId() { return `tmp_${++_tempId}_${Date.now()}`; }

// ─── Empty-line factories ──────────────────────────────────────────────────────

export function emptyBeneficiaryLine(): BeneficiaryLine {
  return {
    tempId: tempId(),
    beneficiaryId: null,
    name: "",
    address: "",
    accountNumber: "",
    bankName: "",
    amount: "",
    invoiceStatus: "pending",
    invoices: [],
  };
}

export function emptyInvoiceLine(): InvoiceLine {
  return {
    tempId: tempId(),
    supplierName: "",
    invoiceNumber: "",
    issueDate: "",
    amount: "",
  };
}

// ─── Numeric helpers ───────────────────────────────────────────────────────────

import { parseNumber } from "@/lib/invoice-tracking-format-helpers";

/** Parse a formatted number string to JS number. */
export function num(s: string): number { return Number(parseNumber(s)) || 0; }

/** Format a Date to Vietnamese dd/mm/yyyy string. */
export function fmtDmy(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// ─── Date calculation helpers ──────────────────────────────────────────────────

/**
 * Given a disbursement start date (dd/mm/yyyy), term length and unit,
 * compute the repayment end date as dd/mm/yyyy.
 */
export function calcEndDateFromTerm(
  startDmy: string,
  term: string,
  unit: "tháng" | "ngày",
): string {
  const iso = dmy2iso(startDmy);
  const n = parseInt(term);
  if (!iso || !n || n <= 0) return "";
  const d = new Date(iso);
  if (unit === "ngày") d.setDate(d.getDate() + n);
  else d.setMonth(d.getMonth() + n);
  return fmtDmy(d);
}

/**
 * Given start and end dates (dd/mm/yyyy) and a unit,
 * compute the term length as a string number.
 */
export function calcTermFromEndDate(
  startDmy: string,
  endDmy: string,
  unit: "tháng" | "ngày",
): string {
  const isoStart = dmy2iso(startDmy);
  const isoEnd = dmy2iso(endDmy);
  if (!isoStart || !isoEnd) return "";
  const s = new Date(isoStart);
  const e = new Date(isoEnd);
  if (e <= s) return "";
  if (unit === "ngày") return String(Math.round((e.getTime() - s.getTime()) / (24 * 3600000)));
  // Calendar month diff
  return String((e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()));
}

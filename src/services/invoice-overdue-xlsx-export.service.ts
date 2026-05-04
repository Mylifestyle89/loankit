/**
 * invoice-overdue-xlsx-export.service.ts
 * Build XLSX workbook (3 sheets) from a DigestSnapshot.
 *
 * Sheets: Quá hạn | Sắp đến hạn | Cần bổ sung
 */
import * as XLSX from "xlsx";

import type { DigestSnapshot } from "@/lib/notifications/collect-digest-items";

const DAY_MS = 24 * 60 * 60 * 1000;

type FlatRow = {
  customerName: string;
  contract: string;
  invoiceNumber: string;
  amount: number;
  dueDate: Date;
  isOverdue: boolean;
  isSupplement: boolean;
};

type SheetSpec = {
  name: string;
  headers: string[];
  widths: number[];
  /** Per-row builder; receives row + now, returns cell array matching headers. */
  buildRow: (r: FlatRow, now: Date) => Array<string | number>;
};

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Neutralize Excel formula injection: prefix risky leading chars with apostrophe. */
function safeText(value: string | null | undefined): string {
  if (!value) return "";
  const s = String(value);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

function daysOverdue(due: Date, now: Date): number {
  if (due >= now) return 0;
  return Math.floor((now.getTime() - due.getTime()) / DAY_MS);
}

function flatten(snapshot: DigestSnapshot): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const { customer, items } of snapshot.values()) {
    for (const item of items) {
      rows.push({
        customerName: customer.customer_name,
        contract: item.contractNumber ?? "—",
        invoiceNumber: item.invoiceNumber,
        amount: item.amount,
        dueDate: item.dueDate,
        isOverdue: item.isOverdue,
        isSupplement: item.isSupplement,
      });
    }
  }
  return rows;
}

const OVERDUE_SPEC: SheetSpec = {
  name: "Quá hạn",
  headers: ["Khách hàng", "Hợp đồng", "Số HĐ", "Số tiền (VND)", "Ngày đến hạn", "Số ngày quá hạn"],
  widths: [28, 22, 22, 18, 14, 16],
  buildRow: (r, now) => [
    safeText(r.customerName),
    safeText(r.contract),
    safeText(r.invoiceNumber),
    r.amount,
    formatDate(r.dueDate),
    daysOverdue(r.dueDate, now),
  ],
};

const DUE_SOON_SPEC: SheetSpec = {
  name: "Sắp đến hạn",
  headers: ["Khách hàng", "Hợp đồng", "Số HĐ", "Số tiền (VND)", "Ngày đến hạn"],
  widths: [28, 22, 22, 18, 14],
  buildRow: (r) => [
    safeText(r.customerName),
    safeText(r.contract),
    safeText(r.invoiceNumber),
    r.amount,
    formatDate(r.dueDate),
  ],
};

const SUPPLEMENT_SPEC: SheetSpec = {
  name: "Cần bổ sung",
  headers: [
    "Khách hàng",
    "Hợp đồng",
    "Beneficiary",
    "Số tiền cần bổ sung (VND)",
    "Ngày đến hạn",
    "Số ngày quá hạn",
  ],
  widths: [28, 22, 22, 22, 14, 16],
  buildRow: (r, now) => [
    safeText(r.customerName),
    safeText(r.contract),
    safeText(r.invoiceNumber),
    r.amount,
    formatDate(r.dueDate),
    daysOverdue(r.dueDate, now),
  ],
};

function buildSheet(rows: FlatRow[], spec: SheetSpec, now: Date): XLSX.WorkSheet {
  const data = rows.map((r) => spec.buildRow(r, now));
  const ws = XLSX.utils.aoa_to_sheet([spec.headers, ...data]);
  ws["!cols"] = spec.widths.map((wch) => ({ wch }));
  return ws;
}

/** Build XLSX buffer from snapshot. Empty snapshots still produce headers. */
export function buildOverdueXlsxBuffer(
  snapshot: DigestSnapshot,
  now: Date = new Date(),
): Buffer {
  const rows = flatten(snapshot);
  const overdueRows = rows.filter((r) => r.isOverdue && !r.isSupplement);
  const dueSoonRows = rows.filter((r) => !r.isOverdue && !r.isSupplement);
  const supplementRows = rows.filter((r) => r.isSupplement);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildSheet(overdueRows, OVERDUE_SPEC, now), OVERDUE_SPEC.name);
  XLSX.utils.book_append_sheet(wb, buildSheet(dueSoonRows, DUE_SOON_SPEC, now), DUE_SOON_SPEC.name);
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(supplementRows, SUPPLEMENT_SPEC, now),
    SUPPLEMENT_SPEC.name,
  );

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

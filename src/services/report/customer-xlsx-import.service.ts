/**
 * customer-xlsx-import.service.ts
 * XLSX import/parse logic — Buffer → v2 import format { version, customers, field_templates }.
 */
import * as XLSX from "xlsx";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

export function groupBy<T extends Record<string, any>>(arr: T[], key: string): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const item of arr) {
    const k = String(item[key] ?? "").trim();
    if (!k) continue;
    if (!map[k]) map[k] = [];
    map[k].push(item);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Import (XLSX → JSON structure matching v2 format)
// ---------------------------------------------------------------------------

export function parseXlsxToImportData(buffer: Buffer): {
  version: string;
  customers: any[];
  field_templates: any[];
} {
  const wb = XLSX.read(buffer, { type: "buffer" });

  // Read sheets by position (sheet names may vary)
  const customersSheet = wb.Sheets[wb.SheetNames[0]];
  const loansSheet = wb.SheetNames.length > 1 ? wb.Sheets[wb.SheetNames[1]] : null;
  const disbSheet = wb.SheetNames.length > 2 ? wb.Sheets[wb.SheetNames[2]] : null;
  const invSheet = wb.SheetNames.length > 3 ? wb.Sheets[wb.SheetNames[3]] : null;
  const benSheet = wb.SheetNames.length > 4 ? wb.Sheets[wb.SheetNames[4]] : null;

  const customersRaw = XLSX.utils.sheet_to_json<Record<string, any>>(customersSheet);
  const loansRaw = loansSheet ? XLSX.utils.sheet_to_json<Record<string, any>>(loansSheet) : [];
  const disbRaw = disbSheet ? XLSX.utils.sheet_to_json<Record<string, any>>(disbSheet) : [];
  const invRaw = invSheet ? XLSX.utils.sheet_to_json<Record<string, any>>(invSheet) : [];
  const benRaw = benSheet ? XLSX.utils.sheet_to_json<Record<string, any>>(benSheet) : [];

  // Group relational rows by foreign key
  const loansByCustomer = groupBy(loansRaw, "Mã KH");
  const disbByContract = groupBy(disbRaw, "Số hợp đồng");
  const invByContract = groupBy(invRaw, "Số hợp đồng");
  const benByContract = groupBy(benRaw, "Số hợp đồng");

  const customers = customersRaw.map((row) => {
    const code = String(row["Mã KH"] ?? "").trim();
    const customerLoans = (loansByCustomer[code] ?? []).map((loanRow) => {
      const contractNum = String(loanRow["Số hợp đồng"] ?? "").trim();
      return {
        contractNumber: contractNum,
        loanAmount: Number(loanRow["Số tiền vay"]) || 0,
        interestRate: loanRow["Lãi suất"] ? Number(loanRow["Lãi suất"]) : null,
        startDate: String(loanRow["Ngày bắt đầu"] ?? ""),
        endDate: String(loanRow["Ngày kết thúc"] ?? ""),
        purpose: loanRow["Mục đích"] || null,
        status: loanRow["Trạng thái"] || "active",
        beneficiaries: (benByContract[contractNum] ?? []).map((b) => ({
          name: String(b["Đơn vị thụ hưởng"] ?? ""),
          accountNumber: b["Số tài khoản"] || null,
          bankName: b["Ngân hàng"] || null,
        })),
        disbursements: (disbByContract[contractNum] ?? []).map((d) => ({
          amount: Number(d["Số tiền"]) || 0,
          disbursementDate: String(d["Ngày giải ngân"] ?? ""),
          description: d["Mô tả"] || null,
          status: d["Trạng thái"] || "active",
          invoices: (invByContract[contractNum] ?? []).map((i) => ({
            invoiceNumber: String(i["Số hoá đơn"] ?? ""),
            supplierName: String(i["Nhà cung cấp"] ?? ""),
            amount: Number(i["Số tiền"]) || 0,
            issueDate: String(i["Ngày phát hành"] ?? ""),
            dueDate: String(i["Ngày đến hạn"] ?? ""),
            status: i["Trạng thái"] || "pending",
            notes: i["Ghi chú"] || null,
          })),
        })),
      };
    });

    return {
      customer_code: code,
      customer_name: String(row["Tên KH"] ?? "").trim(),
      address: row["Địa chỉ"] || null,
      main_business: row["Ngành nghề"] || null,
      charter_capital: row["Vốn điều lệ"] ? Number(row["Vốn điều lệ"]) : null,
      legal_representative_name: row["Người đại diện"] || null,
      legal_representative_title: row["Chức vụ"] || null,
      organization_type: row["Loại hình"] || null,
      data_json: null,
      loans: customerLoans,
    };
  });

  return { version: "2.0", customers, field_templates: [] };
}

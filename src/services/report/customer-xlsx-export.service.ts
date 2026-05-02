/**
 * customer-xlsx-export.service.ts
 * XLSX export logic — CustomerWithRelations[] → multi-sheet workbook Buffer.
 */
import * as XLSX from "xlsx";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type CustomerWithRelations = {
  customer_code: string;
  customer_name: string;
  address?: string | null;
  main_business?: string | null;
  charter_capital?: number | null;
  legal_representative_name?: string | null;
  legal_representative_title?: string | null;
  organization_type?: string | null;
  email?: string | null;
  data_json?: string | null;
  loans?: LoanRecord[];
};

export type LoanRecord = {
  contractNumber: string;
  loanAmount: number;
  interestRate?: number | null;
  startDate: string | Date;
  endDate: string | Date;
  purpose?: string | null;
  status?: string;
  beneficiaries?: BeneficiaryRecord[];
  disbursements?: DisbursementRecord[];
};

export type DisbursementRecord = {
  amount: number;
  disbursementDate: string | Date;
  description?: string | null;
  status?: string;
  invoices?: InvoiceRecord[];
  beneficiaryLines?: DisbursementBeneficiaryRecord[];
};

export type InvoiceRecord = {
  invoiceNumber: string;
  supplierName: string;
  amount: number;
  issueDate: string | Date;
  dueDate: string | Date;
  status?: string;
  notes?: string | null;
};

export type BeneficiaryRecord = {
  name: string;
  accountNumber?: string | null;
  bankName?: string | null;
};

export type DisbursementBeneficiaryRecord = {
  beneficiaryName: string;
  accountNumber?: string | null;
  bankName?: string | null;
  amount: number;
  invoiceStatus?: string;
  invoiceAmount?: number;
  invoices?: InvoiceRecord[];
};

// ---------------------------------------------------------------------------
// Column definitions (kept here for self-documentation, unused at runtime)
// ---------------------------------------------------------------------------

const customerColumns = [
  { header: "Mã KH", key: "customer_code" },
  { header: "Tên KH", key: "customer_name" },
  { header: "Địa chỉ", key: "address" },
  { header: "Ngành nghề", key: "main_business" },
  { header: "Vốn điều lệ", key: "charter_capital" },
  { header: "Người đại diện", key: "legal_representative_name" },
  { header: "Chức vụ", key: "legal_representative_title" },
  { header: "Loại hình", key: "organization_type" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function toDateStr(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function exportCustomersToXlsx(customers: CustomerWithRelations[]): Buffer {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Customers
  const customerRows = customers.map((c) =>
    Object.fromEntries(customerColumns.map((col) => [col.header, (c as any)[col.key] ?? ""]))
  );
  const wsCustomers = XLSX.utils.json_to_sheet(customerRows);
  XLSX.utils.book_append_sheet(wb, wsCustomers, "Khách hàng");

  // Sheet 2-5: Loans, Disbursements, Invoices, Beneficiaries
  const loanRows: Record<string, any>[] = [];
  const disbursementRows: Record<string, any>[] = [];
  const invoiceRows: Record<string, any>[] = [];
  const beneficiaryRows: Record<string, any>[] = [];

  for (const customer of customers) {
    for (const loan of customer.loans ?? []) {
      loanRows.push({
        "Mã KH": customer.customer_code,
        "Số hợp đồng": loan.contractNumber,
        "Số tiền vay": loan.loanAmount,
        "Lãi suất": loan.interestRate ?? "",
        "Ngày bắt đầu": toDateStr(loan.startDate),
        "Ngày kết thúc": toDateStr(loan.endDate),
        "Mục đích": loan.purpose ?? "",
        "Trạng thái": loan.status ?? "active",
      });

      for (const ben of loan.beneficiaries ?? []) {
        beneficiaryRows.push({
          "Số hợp đồng": loan.contractNumber,
          "Đơn vị thụ hưởng": ben.name,
          "Số tài khoản": ben.accountNumber ?? "",
          "Ngân hàng": ben.bankName ?? "",
        });
      }

      for (const disb of loan.disbursements ?? []) {
        disbursementRows.push({
          "Số hợp đồng": loan.contractNumber,
          "Số tiền": disb.amount,
          "Ngày giải ngân": toDateStr(disb.disbursementDate),
          "Mô tả": disb.description ?? "",
          "Trạng thái": disb.status ?? "active",
        });

        for (const inv of disb.invoices ?? []) {
          invoiceRows.push({
            "Số hợp đồng": loan.contractNumber,
            "Số hoá đơn": inv.invoiceNumber,
            "Nhà cung cấp": inv.supplierName,
            "Số tiền": inv.amount,
            "Ngày phát hành": toDateStr(inv.issueDate),
            "Ngày đến hạn": toDateStr(inv.dueDate),
            "Trạng thái": inv.status ?? "pending",
            "Ghi chú": inv.notes ?? "",
          });
        }
      }
    }
  }

  const wsLoans = XLSX.utils.json_to_sheet(loanRows.length > 0 ? loanRows : [{}]);
  XLSX.utils.book_append_sheet(wb, wsLoans, "Khoản vay");

  const wsDisb = XLSX.utils.json_to_sheet(disbursementRows.length > 0 ? disbursementRows : [{}]);
  XLSX.utils.book_append_sheet(wb, wsDisb, "Giải ngân");

  const wsInv = XLSX.utils.json_to_sheet(invoiceRows.length > 0 ? invoiceRows : [{}]);
  XLSX.utils.book_append_sheet(wb, wsInv, "Hoá đơn");

  const wsBen = XLSX.utils.json_to_sheet(beneficiaryRows.length > 0 ? beneficiaryRows : [{}]);
  XLSX.utils.book_append_sheet(wb, wsBen, "Thụ hưởng");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

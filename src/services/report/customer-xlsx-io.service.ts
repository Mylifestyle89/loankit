/**
 * XLSX export/import for customer data with nested relations.
 * Multi-sheet workbook: Customers, Loans, Disbursements, Invoices, Beneficiaries.
 */
import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
type CustomerWithRelations = {
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

type LoanRecord = {
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

type DisbursementRecord = {
  amount: number;
  disbursementDate: string | Date;
  description?: string | null;
  status?: string;
  invoices?: InvoiceRecord[];
  beneficiaryLines?: DisbursementBeneficiaryRecord[];
};

type InvoiceRecord = {
  invoiceNumber: string;
  supplierName: string;
  amount: number;
  issueDate: string | Date;
  dueDate: string | Date;
  status?: string;
  notes?: string | null;
};

type BeneficiaryRecord = {
  name: string;
  accountNumber?: string | null;
  bankName?: string | null;
};

type DisbursementBeneficiaryRecord = {
  beneficiaryName: string;
  accountNumber?: string | null;
  bankName?: string | null;
  amount: number;
  invoiceStatus?: string;
  invoiceAmount?: number;
  invoices?: InvoiceRecord[];
};

// ---------------------------------------------------------------------------
// Column definitions
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

const loanColumns = [
  { header: "Mã KH", key: "customer_code" },
  { header: "Số hợp đồng", key: "contractNumber" },
  { header: "Số tiền vay", key: "loanAmount" },
  { header: "Lãi suất", key: "interestRate" },
  { header: "Ngày bắt đầu", key: "startDate" },
  { header: "Ngày kết thúc", key: "endDate" },
  { header: "Mục đích", key: "purpose" },
  { header: "Trạng thái", key: "status" },
];

const disbursementColumns = [
  { header: "Số hợp đồng", key: "contractNumber" },
  { header: "Số tiền", key: "amount" },
  { header: "Ngày giải ngân", key: "disbursementDate" },
  { header: "Mô tả", key: "description" },
  { header: "Trạng thái", key: "status" },
];

const invoiceColumns = [
  { header: "Số hợp đồng", key: "contractNumber" },
  { header: "Số hoá đơn", key: "invoiceNumber" },
  { header: "Nhà cung cấp", key: "supplierName" },
  { header: "Số tiền", key: "amount" },
  { header: "Ngày phát hành", key: "issueDate" },
  { header: "Ngày đến hạn", key: "dueDate" },
  { header: "Trạng thái", key: "status" },
  { header: "Ghi chú", key: "notes" },
];

const beneficiaryColumns = [
  { header: "Số hợp đồng", key: "contractNumber" },
  { header: "Đơn vị thụ hưởng", key: "name" },
  { header: "Số tài khoản", key: "accountNumber" },
  { header: "Ngân hàng", key: "bankName" },
];

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function toDateStr(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().split("T")[0];
}

export function exportCustomersToXlsx(customers: CustomerWithRelations[]): Buffer {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Customers
  const customerRows = customers.map((c) =>
    Object.fromEntries(customerColumns.map((col) => [col.header, (c as any)[col.key] ?? ""]))
  );
  const wsCustomers = XLSX.utils.json_to_sheet(customerRows);
  XLSX.utils.book_append_sheet(wb, wsCustomers, "Khách hàng");

  // Sheet 2: Loans
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

// ---------------------------------------------------------------------------
// Import (XLSX → JSON structure matching v2 format)
// ---------------------------------------------------------------------------

export function parseXlsxToImportData(buffer: Buffer): {
  version: string;
  customers: any[];
  field_templates: any[];
} {
  const wb = XLSX.read(buffer, { type: "buffer" });

  // Read sheets
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

  // Group by reference keys
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

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function groupBy<T extends Record<string, any>>(arr: T[], key: string): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const item of arr) {
    const k = String(item[key] ?? "").trim();
    if (!k) continue;
    if (!map[k]) map[k] = [];
    map[k].push(item);
  }
  return map;
}

// Suppress unused variable warnings for column definitions used as documentation
void loanColumns;
void disbursementColumns;
void invoiceColumns;
void beneficiaryColumns;

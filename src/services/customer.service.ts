import type { Customer } from "@prisma/client";

import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import { prisma } from "@/lib/prisma";
import {
  extractCoBorrower,
  extractCollateral,
  extractCreditAgribank,
  extractCreditOther,
  extractLoan,
  extractDisbursement,
  extractBeneficiary,
  extractAllCoBorrowers,
  extractAllCollaterals,
  extractAllCreditAgribank,
  extractAllCreditOther,
  extractAllDisbursements,
  extractAllBeneficiaries,
} from "./bk-to-customer-relations";

const FIELD_TO_COLUMN: Record<string, string> = {
  "A.general.customer_name": "customer_name",
  "A.general.customer_code": "customer_code",
  "A.general.address": "address",
  "A.general.main_business": "main_business",
  "A.general.charter_capital": "charter_capital",
  "A.general.legal_representative_name": "legal_representative_name",
  "A.general.legal_representative_title": "legal_representative_title",
  "A.general.organization_type": "organization_type",
  // Individual-specific fields
  "A.general.cccd": "cccd",
  "A.management.id_issue_date": "cccd_issued_date",
  "A.management.id_issue_location": "cccd_issued_place",
  "A.general.date_of_birth": "date_of_birth",
  "A.general.gender_prefix": "gender",
  "A.general.phone": "phone",
  "A.general.marital_status": "marital_status",
  "A.general.spouse_name": "spouse_name",
  "A.general.spouse_cccd": "spouse_cccd",
  "A.credit.bank_account_number": "bank_account",
  "A.credit.bank_account_location": "bank_name",
  "A.general.customer_type": "customer_type",
};

const COLUMN_TO_FIELD: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_TO_COLUMN).map(([field, col]) => [col, field]),
);

export type CreateCustomerInput = {
  customer_code: string;
  customer_name: string;
  customer_type?: string; // "corporate" | "individual"
  address?: string | null;
  main_business?: string | null;
  charter_capital?: number | null;
  legal_representative_name?: string | null;
  legal_representative_title?: string | null;
  organization_type?: string | null;
  // Individual-specific
  cccd?: string | null;
  cccd_issued_date?: string | null;
  cccd_issued_place?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  phone?: string | null;
  marital_status?: string | null;
  spouse_name?: string | null;
  spouse_cccd?: string | null;
  bank_account?: string | null;
  bank_name?: string | null;
  email?: string | null;
  active_branch_id?: string | null;
  relationship_officer?: string | null;
  appraiser?: string | null;
  approver_name?: string | null;
  approver_title?: string | null;
  data_json?: Record<string, unknown>;
};

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    if (cleaned === "") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStringOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** Derive gender from Vietnamese prefix: Ông→male, Bà→female */
function deriveGender(prefix: string | null): string | null {
  if (!prefix) return null;
  const p = prefix.trim().toLowerCase();
  if (p === "ông" || p === "mr") return "male";
  if (p === "bà" || p === "mrs" || p === "ms") return "female";
  return null;
}

function parseCustomerDataJson(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toCreateDbData(input: CreateCustomerInput) {
  return {
    customer_code: input.customer_code,
    customer_name: input.customer_name,
    customer_type: input.customer_type ?? "corporate",
    address: input.address ?? null,
    main_business: input.main_business ?? null,
    charter_capital: input.charter_capital ?? null,
    legal_representative_name: input.legal_representative_name ?? null,
    legal_representative_title: input.legal_representative_title ?? null,
    organization_type: input.organization_type ?? null,
    cccd: input.cccd ?? null,
    cccd_issued_date: input.cccd_issued_date ?? null,
    cccd_issued_place: input.cccd_issued_place ?? null,
    date_of_birth: input.date_of_birth ?? null,
    gender: input.gender ?? null,
    phone: input.phone ?? null,
    marital_status: input.marital_status ?? null,
    spouse_name: input.spouse_name ?? null,
    spouse_cccd: input.spouse_cccd ?? null,
    bank_account: input.bank_account ?? null,
    bank_name: input.bank_name ?? null,
    email: input.email ?? null,
    ...(input.data_json !== undefined ? { data_json: JSON.stringify(input.data_json) } : {}),
  };
}

function toUpdateDbData(input: UpdateCustomerInput) {
  const data: Record<string, unknown> = {};
  if (input.customer_code !== undefined) data.customer_code = input.customer_code;
  if (input.customer_name !== undefined) data.customer_name = input.customer_name;
  if (input.customer_type !== undefined) data.customer_type = input.customer_type;
  if (input.address !== undefined) data.address = input.address;
  if (input.main_business !== undefined) data.main_business = input.main_business;
  if (input.charter_capital !== undefined) data.charter_capital = input.charter_capital;
  if (input.legal_representative_name !== undefined) data.legal_representative_name = input.legal_representative_name;
  if (input.legal_representative_title !== undefined) data.legal_representative_title = input.legal_representative_title;
  if (input.organization_type !== undefined) data.organization_type = input.organization_type;
  if (input.cccd !== undefined) data.cccd = input.cccd;
  if (input.cccd_issued_date !== undefined) data.cccd_issued_date = input.cccd_issued_date;
  if (input.cccd_issued_place !== undefined) data.cccd_issued_place = input.cccd_issued_place;
  if (input.date_of_birth !== undefined) data.date_of_birth = input.date_of_birth;
  if (input.gender !== undefined) data.gender = input.gender;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.marital_status !== undefined) data.marital_status = input.marital_status;
  if (input.spouse_name !== undefined) data.spouse_name = input.spouse_name;
  if (input.spouse_cccd !== undefined) data.spouse_cccd = input.spouse_cccd;
  if (input.bank_account !== undefined) data.bank_account = input.bank_account;
  if (input.bank_name !== undefined) data.bank_name = input.bank_name;
  if (input.email !== undefined) data.email = input.email;
  if (input.active_branch_id !== undefined) data.active_branch_id = input.active_branch_id;
  if (input.relationship_officer !== undefined) data.relationship_officer = input.relationship_officer;
  if (input.appraiser !== undefined) data.appraiser = input.appraiser;
  if (input.approver_name !== undefined) data.approver_name = input.approver_name;
  if (input.approver_title !== undefined) data.approver_title = input.approver_title;
  if (input.data_json !== undefined) data.data_json = JSON.stringify(input.data_json);
  return data;
}

export const customerService = {
  async listCustomers(filter?: { customer_type?: string }): Promise<Customer[]> {
    return prisma.customer.findMany({
      where: filter?.customer_type ? { customer_type: filter.customer_type } : undefined,
      orderBy: { updatedAt: "desc" },
    });
  },

  async getCustomerById(id: string): Promise<Customer> {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundError("Customer not found.");
    return customer;
  },

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    if (!input.customer_code?.trim() || !input.customer_name?.trim()) {
      throw new ValidationError("customer_code và customer_name là bắt buộc.");
    }
    // Auto-pull global branch & staff config for new customers
    const globalCfg = await prisma.reportConfig.findUnique({ where: { key: "branch_staff_config" } });
    let branchStaff: Record<string, string | null> = {};
    if (globalCfg) {
      try {
        const cfg = JSON.parse(globalCfg.valueJson);
        branchStaff = {
          active_branch_id: cfg.active_branch_id ?? null,
          relationship_officer: cfg.relationship_officer ?? null,
          appraiser: cfg.appraiser ?? null,
          approver_name: cfg.approver_name ?? null,
          approver_title: cfg.approver_title ?? null,
        };
      } catch { /* ignore malformed JSON */ }
    }
    return prisma.customer.create({
      data: {
        ...toCreateDbData({
          ...input,
          customer_code: input.customer_code.trim(),
          customer_name: input.customer_name.trim(),
        }),
        ...branchStaff,
      },
    });
  },

  async updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Customer not found.");
    return prisma.customer.update({
      where: { id },
      data: toUpdateDbData(input),
    });
  },

  async deleteCustomer(id: string): Promise<void> {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Customer not found.");
    await prisma.customer.delete({ where: { id } });
  },

  async saveFromDraft(
    values: Record<string, unknown>,
    assetGroups?: Record<string, Record<string, string>[]>,
  ): Promise<{ customer: Customer; created: boolean; message: string }> {
    const customer_name = toStringOrNull(values["A.general.customer_name"]);
    const customer_code = toStringOrNull(values["A.general.customer_code"]);
    if (!customer_name) {
      throw new ValidationError("Tên khách hàng (A.general.customer_name) không được để trống.");
    }

    // Auto-detect customer type: if CCCD/CMND present → individual
    const cccd = toStringOrNull(values["A.general.cccd"]);
    const isIndividual = !!cccd || values["A.general.customer_type"] === "individual";

    const payload = {
      customer_code: customer_code ?? customer_name,
      customer_name,
      customer_type: isIndividual ? "individual" : "corporate",
      address: toStringOrNull(values["A.general.address"]),
      main_business: toStringOrNull(values["A.general.main_business"]),
      charter_capital: toNumber(values["A.general.charter_capital"]),
      legal_representative_name: toStringOrNull(values["A.general.legal_representative_name"]),
      legal_representative_title: toStringOrNull(values["A.general.legal_representative_title"]),
      organization_type: toStringOrNull(values["A.general.organization_type"]),
      cccd,
      cccd_issued_date: toStringOrNull(values["A.management.id_issue_date"]),
      cccd_issued_place: toStringOrNull(values["A.management.id_issue_location"]),
      date_of_birth: toStringOrNull(values["A.general.date_of_birth"]),
      gender: deriveGender(toStringOrNull(values["A.general.gender_prefix"])),
      phone: toStringOrNull(values["A.general.phone"]),
      marital_status: toStringOrNull(values["A.general.marital_status"]),
      spouse_name: toStringOrNull(values["A.general.spouse_name"]),
      spouse_cccd: toStringOrNull(values["A.general.spouse_cccd"]),
      bank_account: toStringOrNull(values["A.credit.bank_account_number"]),
      bank_name: toStringOrNull(values["A.credit.bank_account_location"]),
    };

    const data_json: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
      if (key in FIELD_TO_COLUMN) continue;
      data_json[key] = value;
    }

    return prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findFirst({
        where: { customer_name: payload.customer_name },
        orderBy: { updatedAt: "desc" },
      });

      const sharedData = {
        customer_code: payload.customer_code,
        customer_type: payload.customer_type,
        address: payload.address,
        main_business: payload.main_business,
        charter_capital: payload.charter_capital,
        legal_representative_name: payload.legal_representative_name,
        legal_representative_title: payload.legal_representative_title,
        organization_type: payload.organization_type,
        cccd: payload.cccd,
        cccd_issued_date: payload.cccd_issued_date,
        cccd_issued_place: payload.cccd_issued_place,
        date_of_birth: payload.date_of_birth,
        gender: payload.gender,
        phone: payload.phone,
        marital_status: payload.marital_status,
        spouse_name: payload.spouse_name,
        spouse_cccd: payload.spouse_cccd,
        bank_account: payload.bank_account,
        bank_name: payload.bank_name,
        data_json: JSON.stringify(data_json),
      };

      let customer: Customer;
      let created: boolean;
      if (existing) {
        customer = await tx.customer.update({ where: { id: existing.id }, data: sharedData });
        created = false;
        // Clear old related records before re-creating from BK
        await tx.coBorrower.deleteMany({ where: { customerId: customer.id } });
        await tx.collateral.deleteMany({ where: { customerId: customer.id } });
        await tx.creditAtAgribank.deleteMany({ where: { customerId: customer.id } });
        await tx.creditAtOther.deleteMany({ where: { customerId: customer.id } });
      } else {
        customer = await tx.customer.create({ data: { customer_name: payload.customer_name, ...sharedData } });
        created = true;
      }

      // ── Create related records from BK values (multi-asset aware) ──
      // Resolve items: use assetGroups if available, otherwise fallback to single extraction
      const resolve = <T>(code: string, allFn: (i: Record<string, unknown>[]) => T[], singleFn: (v: Record<string, unknown>) => T | null): T[] =>
        assetGroups?.[code]?.length ? allFn(assetGroups[code]) : [singleFn(values)].filter((x): x is T => x !== null);

      const cbData = resolve("TV", extractAllCoBorrowers, extractCoBorrower).map(cb => ({ customerId: customer.id, ...cb }));
      if (cbData.length) await tx.coBorrower.createMany({ data: cbData });

      const colData = resolve("SĐ", extractAllCollaterals, extractCollateral).map(c => ({ customerId: customer.id, ...c }));
      if (colData.length) await tx.collateral.createMany({ data: colData });

      const caData = resolve("VBA", extractAllCreditAgribank, extractCreditAgribank).map(c => ({ customerId: customer.id, ...c }));
      if (caData.length) await tx.creditAtAgribank.createMany({ data: caData });

      const coData = resolve("TCTD", extractAllCreditOther, extractCreditOther).map(c => ({ customerId: customer.id, ...c }));
      if (coData.length) await tx.creditAtOther.createMany({ data: coData });

      // Loan + Disbursement + Beneficiary (nested under loan)
      const loanData = extractLoan(values);
      if (loanData) {
        const existingLoan = await tx.loan.findUnique({ where: { contractNumber: loanData.contractNumber } });
        if (!existingLoan) {
          const loan = await tx.loan.create({ data: { customerId: customer.id, ...loanData } });

          const disbData = resolve("GN", extractAllDisbursements, extractDisbursement).map(d => ({ loanId: loan.id, disbursementDate: new Date(), ...d }));
          if (disbData.length) await tx.disbursement.createMany({ data: disbData });

          const benData = resolve("UNC", extractAllBeneficiaries, extractBeneficiary).map(b => ({ loanId: loan.id, ...b }));
          if (benData.length) await tx.beneficiary.createMany({ data: benData });
        }
      }

      const action = created ? "Tạo mới" : "Cập nhật";
      return { customer, created, message: `${action} khách hàng và dữ liệu liên quan thành công.` };
    });
  },

  /** Fetch customer with ALL relations: loans, disbursements, invoices, beneficiaries, mapping instances */
  async getFullProfile(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        loans: {
          orderBy: { createdAt: "desc" },
          include: {
            beneficiaries: true,
            disbursements: {
              orderBy: { disbursementDate: "desc" },
              include: {
                invoices: true,
                beneficiaryLines: {
                  include: { invoices: true },
                },
              },
            },
          },
        },
        mapping_instances: {
          orderBy: { updatedAt: "desc" },
          include: { master: true },
        },
      },
    });
    if (!customer) throw new NotFoundError("Customer not found.");

    // Compute summary stats
    const loans = customer.loans;
    let totalDisbursements = 0;
    let totalInvoices = 0;
    let totalDisbursedAmount = 0;
    let totalInvoiceAmount = 0;
    let overdueInvoices = 0;

    for (const loan of loans) {
      totalDisbursements += loan.disbursements.length;
      for (const d of loan.disbursements) {
        totalDisbursedAmount += d.amount;
        totalInvoices += d.invoices.length;
        for (const inv of d.invoices) {
          totalInvoiceAmount += inv.amount;
          if (inv.status === "overdue") overdueInvoices++;
        }
      }
    }

    const summary = {
      totalLoans: loans.length,
      activeLoans: loans.filter((l: { status: string }) => l.status === "active").length,
      totalLoanAmount: loans.reduce((s: number, l: { loanAmount: number }) => s + l.loanAmount, 0),
      totalDisbursements,
      totalDisbursedAmount,
      totalInvoices,
      totalInvoiceAmount,
      overdueInvoices,
      totalMappingInstances: customer.mapping_instances.length,
    };

    return { ...customer, summary };
  },

  async toDraft(params: { customerId?: string; customerName?: string }): Promise<{ customer: Customer; values: Record<string, unknown> }> {
    if (!params.customerId && !params.customerName) {
      throw new ValidationError("customer_id hoặc customer_name phải được cung cấp.");
    }

    const customer = params.customerId
      ? await prisma.customer.findUnique({ where: { id: params.customerId } })
      : await prisma.customer.findFirst({
          where: { customer_name: params.customerName },
          orderBy: { updatedAt: "desc" },
        });
    if (!customer) throw new NotFoundError("Không tìm thấy khách hàng.");

    const values: Record<string, unknown> = {};
    // Map all top-level columns that have a field mapping
    const columnFields: Array<[string, unknown]> = [
      ["customer_name", customer.customer_name],
      ["customer_code", customer.customer_code],
      ["customer_type", customer.customer_type],
      ["address", customer.address],
      ["main_business", customer.main_business],
      ["charter_capital", customer.charter_capital],
      ["legal_representative_name", customer.legal_representative_name],
      ["legal_representative_title", customer.legal_representative_title],
      ["organization_type", customer.organization_type],
      ["cccd", customer.cccd],
      ["cccd_issued_date", customer.cccd_issued_date],
      ["cccd_issued_place", customer.cccd_issued_place],
      ["date_of_birth", customer.date_of_birth],
      ["gender", customer.gender],
      ["phone", customer.phone],
      ["marital_status", customer.marital_status],
      ["spouse_name", customer.spouse_name],
      ["spouse_cccd", customer.spouse_cccd],
      ["bank_account", customer.bank_account],
      ["bank_name", customer.bank_name],
    ];
    for (const [col, val] of columnFields) {
      if (val != null && val !== "") {
        const fieldKey = COLUMN_TO_FIELD[col];
        if (fieldKey) values[fieldKey] = val;
      }
    }

    const extraData = parseCustomerDataJson(customer.data_json);
    Object.assign(values, extraData);

    return { customer, values };
  },
};


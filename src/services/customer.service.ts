import type { Customer } from "@prisma/client";

import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import { prisma } from "@/lib/prisma";

const FIELD_TO_COLUMN: Record<string, string> = {
  "A.general.customer_name": "customer_name",
  "A.general.customer_code": "customer_code",
  "A.general.address": "address",
  "A.general.main_business": "main_business",
  "A.general.charter_capital": "charter_capital",
  "A.general.legal_representative_name": "legal_representative_name",
  "A.general.legal_representative_title": "legal_representative_title",
  "A.general.organization_type": "organization_type",
};

const COLUMN_TO_FIELD: Record<string, string> = {
  customer_name: "A.general.customer_name",
  customer_code: "A.general.customer_code",
  address: "A.general.address",
  main_business: "A.general.main_business",
  charter_capital: "A.general.charter_capital",
  legal_representative_name: "A.general.legal_representative_name",
  legal_representative_title: "A.general.legal_representative_title",
  organization_type: "A.general.organization_type",
};

export type CreateCustomerInput = {
  customer_code: string;
  customer_name: string;
  address?: string | null;
  main_business?: string | null;
  charter_capital?: number | null;
  legal_representative_name?: string | null;
  legal_representative_title?: string | null;
  organization_type?: string | null;
  email?: string | null;
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
    address: input.address ?? null,
    main_business: input.main_business ?? null,
    charter_capital: input.charter_capital ?? null,
    legal_representative_name: input.legal_representative_name ?? null,
    legal_representative_title: input.legal_representative_title ?? null,
    organization_type: input.organization_type ?? null,
    email: input.email ?? null,
    ...(input.data_json !== undefined ? { data_json: JSON.stringify(input.data_json) } : {}),
  };
}

function toUpdateDbData(input: UpdateCustomerInput) {
  const data: {
    customer_code?: string;
    customer_name?: string;
    address?: string | null;
    main_business?: string | null;
    charter_capital?: number | null;
    legal_representative_name?: string | null;
    legal_representative_title?: string | null;
    organization_type?: string | null;
    email?: string | null;
    data_json?: string;
  } = {};
  if (input.customer_code !== undefined) data.customer_code = input.customer_code;
  if (input.customer_name !== undefined) data.customer_name = input.customer_name;
  if (input.address !== undefined) data.address = input.address;
  if (input.main_business !== undefined) data.main_business = input.main_business;
  if (input.charter_capital !== undefined) data.charter_capital = input.charter_capital;
  if (input.legal_representative_name !== undefined) data.legal_representative_name = input.legal_representative_name;
  if (input.legal_representative_title !== undefined) data.legal_representative_title = input.legal_representative_title;
  if (input.organization_type !== undefined) data.organization_type = input.organization_type;
  if (input.email !== undefined) data.email = input.email;
  if (input.data_json !== undefined) data.data_json = JSON.stringify(input.data_json);
  return data;
}

export const customerService = {
  async listCustomers(): Promise<Customer[]> {
    return prisma.customer.findMany({ orderBy: { updatedAt: "desc" } });
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
    return prisma.customer.create({
      data: toCreateDbData({
        ...input,
        customer_code: input.customer_code.trim(),
        customer_name: input.customer_name.trim(),
      }),
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

  async saveFromDraft(values: Record<string, unknown>): Promise<{ customer: Customer; created: boolean; message: string }> {
    const customer_name = toStringOrNull(values["A.general.customer_name"]);
    const customer_code = toStringOrNull(values["A.general.customer_code"]);
    if (!customer_name) {
      throw new ValidationError("Tên khách hàng (A.general.customer_name) không được để trống.");
    }

    const payload = {
      customer_code: customer_code ?? customer_name,
      customer_name,
      address: toStringOrNull(values["A.general.address"]),
      main_business: toStringOrNull(values["A.general.main_business"]),
      charter_capital: toNumber(values["A.general.charter_capital"]),
      legal_representative_name: toStringOrNull(values["A.general.legal_representative_name"]),
      legal_representative_title: toStringOrNull(values["A.general.legal_representative_title"]),
      organization_type: toStringOrNull(values["A.general.organization_type"]),
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

      if (existing) {
        const customer = await tx.customer.update({
          where: { id: existing.id },
          data: {
            customer_code: payload.customer_code,
            address: payload.address,
            main_business: payload.main_business,
            charter_capital: payload.charter_capital,
            legal_representative_name: payload.legal_representative_name,
            legal_representative_title: payload.legal_representative_title,
            organization_type: payload.organization_type,
            data_json: JSON.stringify(data_json),
          },
        });
        return { customer, created: false, message: "Đã cập nhật khách hàng theo tên." };
      }

      const customer = await tx.customer.create({
        data: {
          customer_code: payload.customer_code,
          customer_name: payload.customer_name,
          address: payload.address,
          main_business: payload.main_business,
          charter_capital: payload.charter_capital,
          legal_representative_name: payload.legal_representative_name,
          legal_representative_title: payload.legal_representative_title,
          organization_type: payload.organization_type,
          data_json: JSON.stringify(data_json),
        },
      });
      return { customer, created: true, message: "Đã tạo khách hàng mới." };
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
    if (customer.customer_name) values[COLUMN_TO_FIELD.customer_name] = customer.customer_name;
    if (customer.customer_code) values[COLUMN_TO_FIELD.customer_code] = customer.customer_code;
    if (customer.address) values[COLUMN_TO_FIELD.address] = customer.address;
    if (customer.main_business) values[COLUMN_TO_FIELD.main_business] = customer.main_business;
    if (customer.charter_capital != null) values[COLUMN_TO_FIELD.charter_capital] = customer.charter_capital;
    if (customer.legal_representative_name) values[COLUMN_TO_FIELD.legal_representative_name] = customer.legal_representative_name;
    if (customer.legal_representative_title) values[COLUMN_TO_FIELD.legal_representative_title] = customer.legal_representative_title;
    if (customer.organization_type) values[COLUMN_TO_FIELD.organization_type] = customer.organization_type;

    const extraData = parseCustomerDataJson(customer.data_json);
    Object.assign(values, extraData);

    return { customer, values };
  },
};


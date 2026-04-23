/**
 * Customer service — CRUD + getFullProfile + re-export barrel.
 * `saveFromDraft` and `toDraft` live in customer-draft.service.ts.
 */
import type { Customer } from "@prisma/client";

import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import { decryptCustomerPii } from "@/lib/field-encryption";
import { prisma } from "@/lib/prisma";
import { toCreateDbData, toUpdateDbData } from "./customer-service-helpers";

import type { CreateCustomerInput, UpdateCustomerInput } from "./customer-service-types";
// Re-export types for backward compatibility
export type { CreateCustomerInput, UpdateCustomerInput };

export { saveFromDraft, toDraft } from "./customer-draft.service";

const FIELD_TO_COLUMN: Record<string, string> = {
  "A.general.customer_name": "customer_name",
  "A.general.customer_code": "customer_code",
  "A.general.address": "address",
  "A.general.main_business": "main_business",
  "A.general.charter_capital": "charter_capital",
  "A.general.legal_representative_name": "legal_representative_name",
  "A.general.legal_representative_title": "legal_representative_title",
  "A.general.organization_type": "organization_type",
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

export const customerService = {
  async listCustomers(filter?: { customer_type?: string; page?: number; limit?: number }) {
    const take = Math.min(filter?.limit ?? 50, 200);
    const skip = ((filter?.page ?? 1) - 1) * take;
    const where = filter?.customer_type ? { customer_type: filter.customer_type } : undefined;
    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          customer_code: true,
          customer_name: true,
          customer_type: true,
          address: true,
          main_business: true,
          charter_capital: true,
          legal_representative_name: true,
          legal_representative_title: true,
          organization_type: true,
          updatedAt: true,
          phone: true,
          cccd: true,
          spouse_cccd: true,
          loans: { where: { status: "active" }, select: { loanAmount: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);
    // Fetch latest activity timestamp per customer (loans, collaterals, loan plans)
    const customerIds = data.map((c) => c.id);
    const [latestLoans, latestCollaterals, latestPlans] = await Promise.all([
      prisma.loan.groupBy({
        by: ["customerId"],
        where: { customerId: { in: customerIds } },
        _max: { updatedAt: true },
      }),
      prisma.collateral.groupBy({
        by: ["customerId"],
        where: { customerId: { in: customerIds } },
        _max: { updatedAt: true },
      }),
      prisma.loanPlan.groupBy({
        by: ["customerId"],
        where: { customerId: { in: customerIds } },
        _max: { updatedAt: true },
      }),
    ]);
    const latestByCustomer = new Map<string, { at: Date; type: string }>();
    const merge = (rows: Array<{ customerId: string; _max: { updatedAt: Date | null } }>, type: string) => {
      for (const r of rows) {
        if (!r._max.updatedAt) continue;
        const cur = latestByCustomer.get(r.customerId);
        if (!cur || r._max.updatedAt > cur.at) latestByCustomer.set(r.customerId, { at: r._max.updatedAt, type });
      }
    };
    merge(latestLoans, "loan");
    merge(latestCollaterals, "collateral");
    merge(latestPlans, "loan_plan");
    return {
      data: data.map((c) => {
        const { loans, ...rest } = c;
        const decrypted = decryptCustomerPii(rest);
        const latest = latestByCustomer.get(c.id);
        // lastActivityAt = latest of customer.updatedAt vs related entities
        const lastActivityAt = latest && latest.at > c.updatedAt ? latest.at : c.updatedAt;
        const lastActivityType = latest && latest.at > c.updatedAt ? latest.type : "customer";
        return {
          ...decrypted,
          activeLoanCount: loans.length,
          activeLoanTotal: loans.reduce((s, l) => s + l.loanAmount, 0),
          lastActivityAt,
          lastActivityType,
        };
      }),
      total, page: filter?.page ?? 1, limit: take,
    };
  },

  async getCustomerById(id: string): Promise<Customer> {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundError("Customer not found.");
    return decryptCustomerPii(customer);
  },

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    if (!input.customer_code?.trim() || !input.customer_name?.trim()) {
      throw new ValidationError("customer_code và customer_name là bắt buộc.");
    }
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
    // Merge data_json patch with existing — prevent client from needing to send entire data_json back
    const mergedInput = input;
    if (input.data_json !== undefined && existing.data_json) {
      try {
        const existingJson = JSON.parse(existing.data_json) as Record<string, unknown>;
        mergedInput.data_json = { ...existingJson, ...input.data_json };
      } catch { /* malformed existing JSON — overwrite */ }
    }
    return prisma.customer.update({
      where: { id },
      data: toUpdateDbData(mergedInput),
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
  ) {
    const { saveFromDraft: _saveFromDraft } = await import("./customer-draft.service");
    return _saveFromDraft(values, assetGroups);
  },

  async toDraft(params: { customerId?: string; customerName?: string }) {
    const { toDraft: _toDraft } = await import("./customer-draft.service");
    return _toDraft(params);
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
        co_borrowers: { select: { id: true } },
        collaterals: { select: { id: true, total_value: true, obligation: true } },
        mapping_instances: {
          orderBy: { updatedAt: "desc" },
          include: { master: true },
        },
      },
    });
    if (!customer) throw new NotFoundError("Customer not found.");
    Object.assign(customer, decryptCustomerPii(customer));

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

    const activeLoans = loans.filter((l: { status: string }) => l.status === "active");
    const debtGroups = activeLoans
      .map((l: { debt_group: string | null }) => l.debt_group)
      .filter((d: string | null): d is string => d !== null && d !== "")
      .sort((a: string, b: string) => Number(b) - Number(a));
    const nearestEndDate = activeLoans
      .map((l: { endDate: Date | null }) => l.endDate)
      .filter((d: Date | null): d is Date => d !== null)
      .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0] ?? null;

    const summary = {
      totalLoans: loans.length,
      activeLoans: activeLoans.length,
      totalLoanAmount: loans.reduce((s: number, l: { loanAmount: number }) => s + l.loanAmount, 0),
      totalDisbursements,
      totalDisbursedAmount,
      totalInvoices,
      totalInvoiceAmount,
      overdueInvoices,
      totalMappingInstances: customer.mapping_instances.length,
      debtGroup: debtGroups[0] ?? null,
      nearestMaturity: nearestEndDate?.toISOString() ?? null,
      coBorrowerCount: customer.co_borrowers.length,
      outstandingBalance: activeLoans.reduce(
        (s: number, l: { loanAmount: number }) => s + l.loanAmount,
        0,
      ),
      totalCollateralValue: customer.collaterals.reduce(
        (s: number, c: { total_value: number | null }) => s + (c.total_value ?? 0),
        0,
      ),
      totalObligation: customer.collaterals.reduce(
        (s: number, c: { obligation: number | null }) => s + (c.obligation ?? 0),
        0,
      ),
    };

    return { ...customer, summary };
  },
};

// Export FIELD_TO_COLUMN for use in customer-draft.service.ts (shared constant)
export { FIELD_TO_COLUMN };

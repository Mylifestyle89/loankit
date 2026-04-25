/**
 * Customer service — CRUD + getFullProfile + re-export barrel.
 * `saveFromDraft` and `toDraft` live in customer-draft.service.ts.
 */
import type { Customer } from "@prisma/client";

import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import { decryptCustomerPii } from "@/lib/field-encryption";
import { prisma } from "@/lib/prisma";
import { checkCustomerAccess, checkLoanAccess, checkDisbursementAccess, checkInvoiceAccess } from "./customer-access.service";
import { saveFromDraft, toDraft } from "./customer-draft.service";
import { getFullProfile } from "./customer-profile.service";
import { toCreateDbData, toUpdateDbData } from "./customer-service-helpers";

import type { CreateCustomerInput, UpdateCustomerInput } from "./customer-service-types";
// Re-export types for backward compatibility
export type { CreateCustomerInput, UpdateCustomerInput };

export { checkCustomerAccess, checkLoanAccess, checkDisbursementAccess, checkInvoiceAccess } from "./customer-access.service";

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
  async listCustomers(filter?: { customer_type?: string; page?: number; limit?: number; userId?: string; isAdmin?: boolean }) {
    const take = Math.min(filter?.limit ?? 50, 200);
    const skip = ((filter?.page ?? 1) - 1) * take;

    // Build ownership filter: admin sees all; others see only owned or granted customers
    const ownershipWhere = filter?.isAdmin
      ? {}
      : {
          OR: [
            { createdById: filter?.userId ?? null },
            { grants: { some: { userId: filter?.userId ?? "" } } },
          ],
        };
    const where = {
      ...(filter?.customer_type ? { customer_type: filter.customer_type } : {}),
      ...ownershipWhere,
    };

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
          collaterals: { select: { total_value: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);
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
        const { loans, collaterals, ...rest } = c;
        const decrypted = decryptCustomerPii(rest);
        const latest = latestByCustomer.get(c.id);
        const lastActivityAt = latest && latest.at > c.updatedAt ? latest.at : c.updatedAt;
        const lastActivityType = latest && latest.at > c.updatedAt ? latest.type : "customer";
        return {
          ...decrypted,
          activeLoanCount: loans.length,
          activeLoanTotal: loans.reduce((s, l) => s + l.loanAmount, 0),
          collateralCount: collaterals.length,
          collateralTotal: collaterals.reduce((s, col) => s + (col.total_value ?? 0), 0),
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

  checkCustomerAccess,
  checkLoanAccess,
  checkDisbursementAccess,
  checkInvoiceAccess,

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
        createdById: input.createdById ?? null,
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

  saveFromDraft,
  toDraft,
  getFullProfile,
};

// Export FIELD_TO_COLUMN for use in customer-draft.service.ts (shared constant)
export { FIELD_TO_COLUMN };

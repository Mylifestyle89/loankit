/**
 * import-relations-create — bulk-create customer relations and loan tree inside a transaction.
 *
 * A-I4: replaces sequential for...of creates with createMany (one round-trip per relation type).
 * A-I7: uses Prisma.XxxCreateManyInput[] types — no `as never` casts.
 */
import type { Prisma } from "@prisma/client";

import {
  encryptCoBorrowerPii,
  encryptRelatedPersonPii,
} from "@/lib/field-encryption";

import type { PrefetchMaps } from "./import-prefetch";
import type {
  ImportDisbursementBeneficiaryRecord,
  ImportInvoiceRecord,
  ImportLoanRecord,
  ImportV2CustomerRecord,
} from "./import-types";

// ---------------------------------------------------------------------------
// Flat customer relations (collaterals, loan_plans, co_borrowers, etc.)
// ---------------------------------------------------------------------------

export async function createCustomerRelations(
  tx: Prisma.TransactionClient,
  customerId: string,
  raw: Record<string, unknown>,
): Promise<void> {
  if (Array.isArray(raw.collaterals)) {
    await tx.collateral.deleteMany({ where: { customerId } });
    const data: Prisma.CollateralCreateManyInput[] = (
      raw.collaterals as Prisma.CollateralCreateManyInput[]
    ).map((col) => ({
      collateral_type: col.collateral_type,
      name: col.name ?? "",
      total_value: col.total_value ?? null,
      obligation: col.obligation ?? null,
      properties_json: col.properties_json ?? "{}",
      customerId,
    }));
    if (data.length) await tx.collateral.createMany({ data });
  }

  if (Array.isArray(raw.loan_plans)) {
    await tx.loanPlan.deleteMany({ where: { customerId } });
    const data: Prisma.LoanPlanCreateManyInput[] = (
      raw.loan_plans as Prisma.LoanPlanCreateManyInput[]
    ).map((lp) => ({
      name: lp.name ?? "",
      loan_method: lp.loan_method ?? "tung_lan",
      status: lp.status ?? "draft",
      cost_items_json: lp.cost_items_json ?? "[]",
      revenue_items_json: lp.revenue_items_json ?? "[]",
      financials_json: lp.financials_json ?? "{}",
      templateId: lp.templateId ?? null,
      customerId,
    }));
    if (data.length) await tx.loanPlan.createMany({ data });
  }

  if (Array.isArray(raw.co_borrowers)) {
    await tx.coBorrower.deleteMany({ where: { customerId } });
    const data: Prisma.CoBorrowerCreateManyInput[] = (
      raw.co_borrowers as Record<string, unknown>[]
    ).map((cb) => {
      const encrypted = encryptCoBorrowerPii({ ...cb, id: undefined, customerId });
      return encrypted as Prisma.CoBorrowerCreateManyInput;
    });
    if (data.length) await tx.coBorrower.createMany({ data });
  }

  if (Array.isArray(raw.related_persons)) {
    await tx.relatedPerson.deleteMany({ where: { customerId } });
    const data: Prisma.RelatedPersonCreateManyInput[] = (
      raw.related_persons as Record<string, unknown>[]
    ).map((rp) => {
      const encrypted = encryptRelatedPersonPii({ ...rp, id: undefined, customerId });
      return encrypted as Prisma.RelatedPersonCreateManyInput;
    });
    if (data.length) await tx.relatedPerson.createMany({ data });
  }

  if (Array.isArray(raw.credit_agribank)) {
    await tx.creditAtAgribank.deleteMany({ where: { customerId } });
    const data: Prisma.CreditAtAgribankCreateManyInput[] = (
      raw.credit_agribank as Prisma.CreditAtAgribankCreateManyInput[]
    ).map((ca) => ({
      branch_name: ca.branch_name ?? null,
      debt_group: ca.debt_group ?? null,
      loan_term: ca.loan_term ?? null,
      debt_amount: ca.debt_amount ?? null,
      loan_purpose: ca.loan_purpose ?? null,
      repayment_source: ca.repayment_source ?? null,
      customerId,
    }));
    if (data.length) await tx.creditAtAgribank.createMany({ data });
  }

  if (Array.isArray(raw.credit_other)) {
    await tx.creditAtOther.deleteMany({ where: { customerId } });
    const data: Prisma.CreditAtOtherCreateManyInput[] = (
      raw.credit_other as Prisma.CreditAtOtherCreateManyInput[]
    ).map((co) => ({
      institution_name: co.institution_name ?? null,
      debt_group: co.debt_group ?? null,
      loan_term: co.loan_term ?? null,
      debt_amount: co.debt_amount ?? null,
      loan_purpose: co.loan_purpose ?? null,
      repayment_source: co.repayment_source ?? null,
      customerId,
    }));
    if (data.length) await tx.creditAtOther.createMany({ data });
  }
}

// ---------------------------------------------------------------------------
// V2 loan tree (loans → disbursements → invoices / beneficiaryLines)
// ---------------------------------------------------------------------------

export interface LoanImportCounters {
  loansImported: number;
  disbursementsImported: number;
  invoicesImported: number;
}

export async function createLoanTree(
  tx: Prisma.TransactionClient,
  customerId: string,
  customerRaw: ImportV2CustomerRecord,
  maps: PrefetchMaps,
): Promise<LoanImportCounters> {
  const counters: LoanImportCounters = {
    loansImported: 0,
    disbursementsImported: 0,
    invoicesImported: 0,
  };

  if (!Array.isArray(customerRaw.loans)) return counters;

  for (const loanRaw of customerRaw.loans as ImportLoanRecord[]) {
    const loanKey = `${customerId}_${loanRaw.contractNumber}`;
    const existingLoan = maps.loanMap.get(loanKey);

    const loanData = {
      loanAmount: loanRaw.loanAmount,
      interestRate: loanRaw.interestRate ?? null,
      startDate: new Date(loanRaw.startDate),
      endDate: new Date(loanRaw.endDate),
      purpose: loanRaw.purpose ?? null,
      disbursementCount: loanRaw.disbursementCount ?? null,
      collateralValue: loanRaw.collateralValue ?? null,
      securedObligation: loanRaw.securedObligation ?? null,
      disbursementLimitByAsset: loanRaw.disbursementLimitByAsset ?? null,
      status: loanRaw.status ?? "active",
    };

    let loanId: string;
    if (existingLoan) {
      await tx.loan.update({ where: { id: existingLoan.id }, data: loanData });
      loanId = existingLoan.id;
    } else {
      const created = await tx.loan.create({
        data: { ...loanData, contractNumber: loanRaw.contractNumber, customerId },
      });
      loanId = created.id;
      maps.loanMap.set(loanKey, {
        id: loanId,
        customerId,
        contractNumber: loanRaw.contractNumber,
      });
    }
    counters.loansImported++;

    // Beneficiaries — create only new ones (no delete, append-only)
    if (Array.isArray(loanRaw.beneficiaries)) {
      const newBens: Prisma.BeneficiaryCreateManyInput[] = [];
      for (const benRaw of loanRaw.beneficiaries) {
        const benKey = `${loanId}_${benRaw.name}_${benRaw.accountNumber ?? ""}`;
        if (!maps.benMap.has(benKey)) {
          newBens.push({
            loanId,
            name: benRaw.name,
            accountNumber: benRaw.accountNumber ?? null,
            bankName: benRaw.bankName ?? null,
          });
        }
      }
      if (newBens.length) {
        // createMany does not return ids on SQLite — fetch after insert
        await tx.beneficiary.createMany({ data: newBens });
        const inserted = await tx.beneficiary.findMany({
          where: { loanId, name: { in: newBens.map((b) => b.name) } },
          select: { id: true, loanId: true, name: true, accountNumber: true },
        });
        for (const b of inserted) {
          maps.benMap.set(`${b.loanId}_${b.name}_${b.accountNumber ?? ""}`, b);
        }
      }
    }

    // Disbursements — wipe existing then recreate (no stable dedup key available)
    if (Array.isArray(loanRaw.disbursements)) {
      await tx.disbursement.deleteMany({ where: { loanId } });
      for (const disbRaw of loanRaw.disbursements) {
        const createdDisb = await tx.disbursement.create({
          data: {
            loanId,
            amount: disbRaw.amount,
            disbursementDate: new Date(disbRaw.disbursementDate),
            description: disbRaw.description ?? null,
            status: disbRaw.status ?? "active",
            currentOutstanding: disbRaw.currentOutstanding ?? null,
            debtAmount: disbRaw.debtAmount ?? null,
            totalOutstanding: disbRaw.totalOutstanding ?? null,
            purpose: disbRaw.purpose ?? null,
            supportingDoc: disbRaw.supportingDoc ?? null,
            loanTerm: disbRaw.loanTerm ?? null,
            repaymentEndDate: disbRaw.repaymentEndDate
              ? new Date(disbRaw.repaymentEndDate)
              : null,
            principalSchedule: disbRaw.principalSchedule ?? null,
            interestSchedule: disbRaw.interestSchedule ?? null,
          },
        });
        counters.disbursementsImported++;

        // Direct invoices on disbursement
        if (Array.isArray(disbRaw.invoices)) {
          const added = await upsertInvoiceBatch(
            tx,
            createdDisb.id,
            null,
            disbRaw.invoices,
            maps.invoiceMap,
          );
          counters.invoicesImported += added;
        }

        // Beneficiary lines + their invoices
        if (Array.isArray(disbRaw.beneficiaryLines)) {
          for (const lineRaw of disbRaw.beneficiaryLines as ImportDisbursementBeneficiaryRecord[]) {
            const dbLine = await tx.disbursementBeneficiary.create({
              data: {
                disbursementId: createdDisb.id,
                beneficiaryName: lineRaw.beneficiaryName,
                accountNumber: lineRaw.accountNumber ?? null,
                bankName: lineRaw.bankName ?? null,
                amount: lineRaw.amount,
                invoiceStatus: lineRaw.invoiceStatus ?? "pending",
                invoiceAmount: lineRaw.invoiceAmount ?? 0,
              },
            });
            if (Array.isArray(lineRaw.invoices)) {
              const added = await upsertInvoiceBatch(
                tx,
                createdDisb.id,
                dbLine.id,
                lineRaw.invoices,
                maps.invoiceMap,
              );
              counters.invoicesImported += added;
            }
          }
        }
      }
    }
  }

  return counters;
}

// ---------------------------------------------------------------------------
// Invoice upsert helper (update if exists by number+supplier, else create)
// ---------------------------------------------------------------------------

async function upsertInvoiceBatch(
  tx: Prisma.TransactionClient,
  disbursementId: string,
  disbursementBeneficiaryId: string | null,
  invoices: ImportInvoiceRecord[],
  invoiceMap: Map<string, { id: string }>,
): Promise<number> {
  let count = 0;
  for (const invRaw of invoices) {
    const mapKey = `${invRaw.invoiceNumber}_${invRaw.supplierName}`;
    const existing = invoiceMap.get(mapKey);
    const invData = {
      amount: invRaw.amount,
      issueDate: new Date(invRaw.issueDate),
      dueDate: new Date(invRaw.dueDate),
      customDeadline: invRaw.customDeadline ? new Date(invRaw.customDeadline) : null,
      status: invRaw.status ?? "pending",
      notes: invRaw.notes ?? null,
    };
    if (existing) {
      await tx.invoice.update({ where: { id: existing.id }, data: invData });
    } else {
      const created = await tx.invoice.create({
        data: {
          ...invData,
          invoiceNumber: invRaw.invoiceNumber,
          supplierName: invRaw.supplierName,
          disbursementId,
          disbursementBeneficiaryId,
        },
      });
      invoiceMap.set(mapKey, { id: created.id });
    }
    count++;
  }
  return count;
}

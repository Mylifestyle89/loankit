/**
 * Data-IO import — importData with nested v2 relations (loans, disbursements, invoices, beneficiaries).
 */
import type { Prisma } from "@prisma/client";

import { ValidationError } from "@/core/errors/app-error";
import { prisma } from "@/lib/prisma";
import { loadState, saveState } from "@/lib/report/fs-store";

import { type ImportCustomerRecord, type ImportTemplateRecord } from "./_shared";

// ---------------------------------------------------------------------------
// Import v2 types
// ---------------------------------------------------------------------------

export type ImportLoanRecord = {
  contractNumber: string;
  loanAmount: number;
  interestRate?: number | null;
  startDate: string;
  endDate: string;
  purpose?: string | null;
  disbursementCount?: string | null;
  collateralValue?: number | null;
  securedObligation?: number | null;
  disbursementLimitByAsset?: number | null;
  status?: string;
  beneficiaries?: ImportBeneficiaryRecord[];
  disbursements?: ImportDisbursementRecord[];
};

export type ImportBeneficiaryRecord = {
  name: string;
  accountNumber?: string | null;
  bankName?: string | null;
};

export type ImportDisbursementRecord = {
  amount: number;
  disbursementDate: string;
  description?: string | null;
  status?: string;
  currentOutstanding?: number | null;
  debtAmount?: number | null;
  totalOutstanding?: number | null;
  purpose?: string | null;
  supportingDoc?: string | null;
  loanTerm?: number | null;
  repaymentEndDate?: string | null;
  principalSchedule?: string | null;
  interestSchedule?: string | null;
  invoices?: ImportInvoiceRecord[];
  beneficiaryLines?: ImportDisbursementBeneficiaryRecord[];
};

export type ImportInvoiceRecord = {
  invoiceNumber: string;
  supplierName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  customDeadline?: string | null;
  status?: string;
  notes?: string | null;
};

export type ImportDisbursementBeneficiaryRecord = {
  beneficiaryName: string;
  accountNumber?: string | null;
  bankName?: string | null;
  amount: number;
  invoiceStatus?: string;
  invoiceAmount?: number;
  invoices?: ImportInvoiceRecord[];
};

type ImportV2CustomerRecord = ImportCustomerRecord & {
  loans?: ImportLoanRecord[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function upsertInvoice(
  tx: Prisma.TransactionClient,
  disbursementId: string,
  disbursementBeneficiaryId: string | null,
  invRaw: ImportInvoiceRecord,
) {
  const existing = await tx.invoice.findFirst({
    where: {
      invoiceNumber: invRaw.invoiceNumber,
      supplierName: invRaw.supplierName,
    },
  });

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
    await tx.invoice.create({
      data: {
        ...invData,
        invoiceNumber: invRaw.invoiceNumber,
        supplierName: invRaw.supplierName,
        disbursementId,
        disbursementBeneficiaryId,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export async function importData(input: {
  version?: unknown;
  customers?: unknown[];
  field_templates?: unknown[];
}) {
  if (!input.version || !Array.isArray(input.customers) || !Array.isArray(input.field_templates)) {
    throw new ValidationError("Định dạng file không hợp lệ");
  }

  const version = String(input.version);
  const isV2 = version.startsWith("2");
  const customersInput = input.customers as (ImportV2CustomerRecord | ImportCustomerRecord)[];
  const fieldTemplatesInput = input.field_templates as ImportTemplateRecord[];

  let customersImported = 0;
  let loansImported = 0;
  let disbursementsImported = 0;
  let invoicesImported = 0;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const customerRaw of customersInput) {
      const existing = await tx.customer.findUnique({
        where: { customer_code: customerRaw.customer_code },
      });

      let customerId: string;
      if (existing) {
        await tx.customer.update({
          where: { id: existing.id },
          data: {
            customer_name: customerRaw.customer_name ?? existing.customer_name,
            address: customerRaw.address,
            main_business: customerRaw.main_business,
            charter_capital: customerRaw.charter_capital,
            legal_representative_name: customerRaw.legal_representative_name,
            legal_representative_title: customerRaw.legal_representative_title,
            organization_type: customerRaw.organization_type,
            data_json: customerRaw.data_json,
          },
        });
        customerId = existing.id;
      } else {
        const created = await tx.customer.create({
          data: {
            customer_code: customerRaw.customer_code,
            customer_name: customerRaw.customer_name,
            address: customerRaw.address,
            main_business: customerRaw.main_business,
            charter_capital: customerRaw.charter_capital,
            legal_representative_name: customerRaw.legal_representative_name,
            legal_representative_title: customerRaw.legal_representative_title,
            organization_type: customerRaw.organization_type,
            data_json: customerRaw.data_json,
          },
        });
        customerId = created.id;
      }
      customersImported++;

      if (isV2 && "loans" in customerRaw && Array.isArray(customerRaw.loans)) {
        for (const loanRaw of customerRaw.loans as ImportLoanRecord[]) {
          const existingLoan = await tx.loan.findFirst({
            where: { customerId, contractNumber: loanRaw.contractNumber },
          });

          let loanId: string;
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

          if (existingLoan) {
            await tx.loan.update({ where: { id: existingLoan.id }, data: loanData });
            loanId = existingLoan.id;
          } else {
            const created = await tx.loan.create({
              data: { ...loanData, contractNumber: loanRaw.contractNumber, customerId },
            });
            loanId = created.id;
          }
          loansImported++;

          if (Array.isArray(loanRaw.beneficiaries)) {
            for (const benRaw of loanRaw.beneficiaries) {
              const existingBen = await tx.beneficiary.findFirst({
                where: { loanId, name: benRaw.name, accountNumber: benRaw.accountNumber ?? undefined },
              });
              if (!existingBen) {
                await tx.beneficiary.create({
                  data: {
                    loanId,
                    name: benRaw.name,
                    accountNumber: benRaw.accountNumber ?? null,
                    bankName: benRaw.bankName ?? null,
                  },
                });
              }
            }
          }

          if (Array.isArray(loanRaw.disbursements)) {
            for (const disbRaw of loanRaw.disbursements) {
              const disbData = {
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
                repaymentEndDate: disbRaw.repaymentEndDate ? new Date(disbRaw.repaymentEndDate) : null,
                principalSchedule: disbRaw.principalSchedule ?? null,
                interestSchedule: disbRaw.interestSchedule ?? null,
              };

              const createdDisb = await tx.disbursement.create({
                data: { ...disbData, loanId },
              });
              disbursementsImported++;

              if (Array.isArray(disbRaw.invoices)) {
                for (const invRaw of disbRaw.invoices) {
                  await upsertInvoice(tx, createdDisb.id, null, invRaw);
                  invoicesImported++;
                }
              }

              if (Array.isArray(disbRaw.beneficiaryLines)) {
                for (const lineRaw of disbRaw.beneficiaryLines) {
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
                    for (const invRaw of lineRaw.invoices) {
                      await upsertInvoice(tx, createdDisb.id, dbLine.id, invRaw);
                      invoicesImported++;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  // Import templates
  const state = await loadState();
  const existingTemplatesMap = new Map((state.field_templates || []).map((t) => [t.id, t]));
  for (const tpl of fieldTemplatesInput) {
    existingTemplatesMap.set(tpl.id, tpl);
  }
  state.field_templates = Array.from(existingTemplatesMap.values());
  await saveState(state);

  return {
    customers: customersImported,
    templates: fieldTemplatesInput.length,
    loans: loansImported,
    disbursements: disbursementsImported,
    invoices: invoicesImported,
  };
}

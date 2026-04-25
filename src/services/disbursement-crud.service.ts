/** Disbursement CRUD operations — create, update, fullUpdate, delete, getById */
import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import { prisma } from "@/lib/prisma";
import { validateBeneficiaryAmounts, createBeneficiaryLines } from "./disbursement-beneficiary-helpers";
import type { CreateDisbursementInput, UpdateDisbursementInput, FullUpdateDisbursementInput } from "./disbursement-service-types";

export async function getById(id: string) {
  const disbursement = await prisma.disbursement.findUnique({
    where: { id },
    include: {
      loan: {
        select: {
          id: true,
          contractNumber: true,
          loanAmount: true,
          loanPlanId: true,
          customer: { select: { id: true, customer_name: true } },
        },
      },
      invoices: { orderBy: { createdAt: "desc" } },
      beneficiaryLines: {
        include: {
          beneficiary: { select: { id: true, name: true } },
          invoices: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!disbursement) throw new NotFoundError("Disbursement not found.");
  return disbursement;
}

export async function create(input: CreateDisbursementInput) {
  if (input.amount <= 0) throw new ValidationError("amount must be positive.");
  const date = new Date(input.disbursementDate);
  if (isNaN(date.getTime())) throw new ValidationError("disbursementDate is not a valid date.");

  const beneficiaries = input.beneficiaries ?? [];
  validateBeneficiaryAmounts(beneficiaries, input.debtAmount ?? input.amount);

  const repaymentEnd = input.repaymentEndDate ? new Date(input.repaymentEndDate) : null;

  return prisma.$transaction(async (tx) => {
    const disbursement = await tx.disbursement.create({
      data: {
        loanId: input.loanId,
        amount: input.amount,
        disbursementDate: date,
        description: input.description ?? null,
        currentOutstanding: input.currentOutstanding ?? null,
        debtAmount: input.debtAmount ?? null,
        totalOutstanding: input.totalOutstanding ?? null,
        purpose: input.purpose ?? null,
        supportingDoc: input.supportingDoc ?? null,
        loanTerm: input.loanTerm ?? null,
        termUnit: input.termUnit ?? null,
        repaymentEndDate: repaymentEnd,
        principalSchedule: input.principalSchedule ?? null,
        interestSchedule: input.interestSchedule ?? null,
      },
    });
    await createBeneficiaryLines(tx, disbursement.id, beneficiaries, date);
    return disbursement;
  });
}

export async function update(id: string, input: UpdateDisbursementInput) {
  const existing = await prisma.disbursement.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Disbursement not found.");

  const data: Record<string, unknown> = {};
  if (input.amount !== undefined) data.amount = input.amount;
  if (input.disbursementDate !== undefined) {
    const date = new Date(input.disbursementDate);
    if (isNaN(date.getTime())) throw new ValidationError("disbursementDate is not a valid date.");
    data.disbursementDate = date;
  }
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) data.status = input.status;

  return prisma.disbursement.update({ where: { id }, data });
}

/** Full update: replace all fields + beneficiary lines atomically */
export async function fullUpdate(id: string, input: FullUpdateDisbursementInput) {
  const existing = await prisma.disbursement.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Disbursement not found.");

  if (input.amount <= 0) throw new ValidationError("amount must be positive.");
  const date = new Date(input.disbursementDate);
  if (isNaN(date.getTime())) throw new ValidationError("disbursementDate is not a valid date.");

  const beneficiaries = input.beneficiaries ?? [];
  validateBeneficiaryAmounts(beneficiaries, input.debtAmount ?? input.amount);

  const repaymentEnd = input.repaymentEndDate ? new Date(input.repaymentEndDate) : null;

  return prisma.$transaction(async (tx) => {
    // Unlink invoices from beneficiary lines before deleting (preserves paid/overdue invoices)
    await tx.invoice.updateMany({
      where: { disbursementId: id, disbursementBeneficiaryId: { not: null } },
      data: { disbursementBeneficiaryId: null },
    });
    await tx.disbursementBeneficiary.deleteMany({ where: { disbursementId: id } });
    await tx.invoice.deleteMany({
      where: { disbursementId: id, disbursementBeneficiaryId: null, status: "pending" },
    });

    const disbursement = await tx.disbursement.update({
      where: { id },
      data: {
        amount: input.amount,
        disbursementDate: date,
        description: input.description ?? null,
        status: input.status ?? existing.status,
        currentOutstanding: input.currentOutstanding ?? null,
        debtAmount: input.debtAmount ?? null,
        totalOutstanding: input.totalOutstanding ?? null,
        purpose: input.purpose ?? null,
        supportingDoc: input.supportingDoc ?? null,
        loanTerm: input.loanTerm ?? null,
        termUnit: input.termUnit ?? null,
        repaymentEndDate: repaymentEnd,
        principalSchedule: input.principalSchedule ?? null,
        interestSchedule: input.interestSchedule ?? null,
      },
    });

    await createBeneficiaryLines(tx, id, beneficiaries, date);
    return disbursement;
  });
}

export async function deleteDisbursement(id: string) {
  const existing = await prisma.disbursement.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Disbursement not found.");
  await prisma.disbursement.delete({ where: { id } });
}

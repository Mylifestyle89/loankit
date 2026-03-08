import type { PrismaClient } from "@prisma/client";
import { ValidationError } from "@/core/errors/app-error";
import { addOneMonthClamped } from "@/lib/invoice-tracking-format-helpers";
import type { BeneficiaryLineInput } from "./disbursement.service";

/** Prisma interactive transaction client type */
type PrismaTx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/** Validate that beneficiary amounts sum equals debt amount (tolerance ±0.01) */
export function validateBeneficiaryAmounts(beneficiaries: BeneficiaryLineInput[], debtAmount: number) {
  if (beneficiaries.length === 0) return;
  const beneficiarySum = beneficiaries.reduce((s, b) => s + b.amount, 0);
  if (Math.abs(beneficiarySum - debtAmount) > 0.01) {
    throw new ValidationError(
      `Beneficiary amounts sum (${beneficiarySum}) must equal debt amount (${debtAmount}).`,
    );
  }
}

/** Create beneficiary lines + their invoices within a transaction */
export async function createBeneficiaryLines(
  tx: PrismaTx,
  disbursementId: string,
  beneficiaries: BeneficiaryLineInput[],
  disbursementDate?: Date,
) {
  for (const b of beneficiaries) {
    const line = await tx.disbursementBeneficiary.create({
      data: {
        disbursementId,
        beneficiaryId: b.beneficiaryId || null,
        beneficiaryName: b.beneficiaryName,
        accountNumber: b.accountNumber ?? null,
        bankName: b.bankName ?? null,
        amount: b.amount,
        invoiceStatus: b.invoiceStatus ?? "pending",
      },
    });

    if (b.invoices?.length) {
      await tx.invoice.createMany({
        data: b.invoices.map((inv) => ({
          disbursementId,
          disbursementBeneficiaryId: line.id,
          invoiceNumber: inv.invoiceNumber,
          supplierName: inv.supplierName,
          amount: inv.amount,
          issueDate: new Date(inv.issueDate),
          dueDate: disbursementDate ? addOneMonthClamped(disbursementDate) : new Date(inv.issueDate),
        })),
      });

      const totalInv = b.invoices.reduce((s, i) => s + i.amount, 0);
      await tx.disbursementBeneficiary.update({
        where: { id: line.id },
        data: { invoiceAmount: totalInv },
      });
    }
  }
}

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

/** Create beneficiary lines + their invoices within a transaction.
 * Validates sum(new beneficiary amounts) + existing ≤ disbursement.amount. */
export async function createBeneficiaryLines(
  tx: PrismaTx,
  disbursementId: string,
  beneficiaries: BeneficiaryLineInput[],
  disbursementDate?: Date,
) {
  // Guard: total beneficiary allocation must not exceed disbursement amount
  const [disb, existingAgg] = await Promise.all([
    tx.disbursement.findUniqueOrThrow({ where: { id: disbursementId }, select: { amount: true } }),
    tx.disbursementBeneficiary.aggregate({ where: { disbursementId }, _sum: { amount: true } }),
  ]);
  const existingSum = existingAgg._sum.amount ?? 0;
  const newSum = beneficiaries.reduce((s, b) => s + b.amount, 0);
  if (existingSum + newSum > disb.amount) {
    throw new ValidationError(
      `Tổng phân bổ (${existingSum + newSum}) vượt số tiền giải ngân (${disb.amount})`,
    );
  }

  for (const b of beneficiaries) {
    const line = await tx.disbursementBeneficiary.create({
      data: {
        disbursementId,
        beneficiaryId: b.beneficiaryId || null,
        beneficiaryName: b.beneficiaryName,
        address: b.address ?? null,
        accountNumber: b.accountNumber ?? null,
        bankName: b.bankName ?? null,
        amount: b.amount,
        invoiceStatus: b.invoiceStatus ?? "pending",
      },
    });

    if (b.invoices?.length) {
      // VAT invoices (has_invoice): batch check duplicate invoiceNumber + supplierName
      if (b.invoiceStatus === "has_invoice") {
        const pairs = b.invoices
          .filter((inv) => inv.invoiceNumber)
          .map((inv) => ({ invoiceNumber: inv.invoiceNumber, supplierName: inv.supplierName }));
        if (pairs.length > 0) {
          const dups = await tx.invoice.findMany({
            where: { OR: pairs },
            select: { invoiceNumber: true, supplierName: true },
            take: 1,
          });
          if (dups.length > 0) {
            throw new ValidationError(
              `Hóa đơn "${dups[0].invoiceNumber}" của "${dups[0].supplierName}" đã tồn tại.`,
            );
          }
        }
      }
      // Bảng kê (bang_ke): allow duplicate item names freely
      await tx.invoice.createMany({
        data: b.invoices.map((inv) => ({
          disbursementId,
          disbursementBeneficiaryId: line.id,
          invoiceNumber: inv.invoiceNumber,
          supplierName: inv.supplierName,
          amount: inv.amount,
          issueDate: new Date(inv.issueDate),
          dueDate: disbursementDate ? addOneMonthClamped(disbursementDate) : new Date(inv.issueDate),
          qty: inv.qty ?? null,
          unitPrice: inv.unitPrice ?? null,
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

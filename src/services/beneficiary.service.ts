import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import { prisma } from "@/lib/prisma";

export type CreateBeneficiaryInput = {
  loanId: string;
  name: string;
  accountNumber?: string;
  bankName?: string;
};

export type UpdateBeneficiaryInput = {
  name?: string;
  accountNumber?: string | null;
  bankName?: string | null;
};

export const beneficiaryService = {
  async listByLoan(loanId: string) {
    return prisma.beneficiary.findMany({
      where: { loanId },
      orderBy: { createdAt: "asc" },
    });
  },

  async getById(id: string) {
    const b = await prisma.beneficiary.findUnique({ where: { id } });
    if (!b) throw new NotFoundError("Beneficiary not found.");
    return b;
  },

  async create(input: CreateBeneficiaryInput) {
    if (!input.name?.trim()) {
      throw new ValidationError("name is required.");
    }
    return prisma.beneficiary.create({
      data: {
        loanId: input.loanId,
        name: input.name.trim(),
        accountNumber: input.accountNumber?.trim() || null,
        bankName: input.bankName?.trim() || null,
      },
    });
  },

  async update(id: string, input: UpdateBeneficiaryInput) {
    const existing = await prisma.beneficiary.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Beneficiary not found.");

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.accountNumber !== undefined) data.accountNumber = input.accountNumber?.trim() || null;
    if (input.bankName !== undefined) data.bankName = input.bankName?.trim() || null;

    return prisma.beneficiary.update({ where: { id }, data });
  },

  async delete(id: string) {
    const existing = await prisma.beneficiary.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Beneficiary not found.");
    await prisma.beneficiary.delete({ where: { id } });
  },

  /** Bulk create from Excel import */
  async bulkCreate(loanId: string, items: { name: string; accountNumber?: string; bankName?: string }[]) {
    const valid = items.filter((i) => i.name?.trim());
    if (valid.length === 0) throw new ValidationError("No valid rows to import.");

    const created = await prisma.beneficiary.createMany({
      data: valid.map((i) => ({
        loanId,
        name: i.name.trim(),
        accountNumber: i.accountNumber?.trim() || null,
        bankName: i.bankName?.trim() || null,
      })),
    });

    return { created: created.count, skipped: items.length - valid.length };
  },
};

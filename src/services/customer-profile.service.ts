/** Customer getFullProfile — deep query with summary aggregation */
import { NotFoundError } from "@/core/errors/app-error";
import { decryptCustomerPii } from "@/lib/field-encryption";
import { prisma } from "@/lib/prisma";

export async function getFullProfile(id: string) {
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
              beneficiaryLines: { include: { invoices: true } },
            },
          },
        },
      },
      createdBy: { select: { id: true, name: true } },
      co_borrowers: { select: { id: true } },
      collaterals: { select: { id: true, total_value: true, obligation: true } },
      mapping_instances: { orderBy: { updatedAt: "desc" }, include: { master: true } },
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
    activeLoanAmount: activeLoans.reduce((s: number, l: { loanAmount: number }) => s + l.loanAmount, 0),
    totalCollateralValue: customer.collaterals.reduce((s: number, c: { total_value: number | null }) => s + (c.total_value ?? 0), 0),
    totalObligation: customer.collaterals.reduce((s: number, c: { obligation: number | null }) => s + (c.obligation ?? 0), 0),
  };

  return { ...customer, summary };
}

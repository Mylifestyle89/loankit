/**
 * import-prefetch — pre-fetch all lookups needed before import loop.
 * Avoids N+1 reads inside the transaction.
 */
import type { Prisma } from "@prisma/client";

import { hashCustomerCode } from "@/lib/field-encryption";

import type { ImportV2CustomerRecord } from "./import-types";

export interface PrefetchMaps {
  customerMap: Map<string, { id: string; customer_code: string }>;
  loanMap: Map<string, { id: string; customerId: string; contractNumber: string }>;
  benMap: Map<string, { id: string; loanId: string; name: string; accountNumber: string | null }>;
  invoiceMap: Map<string, { id: string }>;
}

export async function prefetchImportMaps(
  tx: Prisma.TransactionClient,
  customersInput: ImportV2CustomerRecord[],
  isV2: boolean,
): Promise<PrefetchMaps> {
  // --- Customer lookup via deterministic hash ---
  const allCustomerCodes = customersInput.map((c) => c.customer_code).filter(Boolean);
  const plainToHash = new Map(allCustomerCodes.map((code) => [code, hashCustomerCode(code)]));
  const allHashes = Array.from(plainToHash.values());
  const existingCustomers = await tx.customer.findMany({
    where: { customer_code_hash: { in: allHashes } },
    select: { id: true, customer_code_hash: true },
  });
  const byHash = new Map(existingCustomers.map((c) => [c.customer_code_hash, c]));
  const customerMap = new Map<string, { id: string; customer_code: string }>();
  for (const [plain, hash] of plainToHash) {
    const row = byHash.get(hash);
    if (row) customerMap.set(plain, { id: row.id, customer_code: plain });
  }

  // --- Loan lookup ---
  const allContractNumbers = customersInput
    .flatMap((c) => (isV2 && Array.isArray(c.loans) ? c.loans.map((l) => l.contractNumber) : []))
    .filter(Boolean);
  const existingLoans = await tx.loan.findMany({
    where: { contractNumber: { in: allContractNumbers } },
    select: { id: true, customerId: true, contractNumber: true },
  });
  const loanMap = new Map(existingLoans.map((l) => [`${l.customerId}_${l.contractNumber}`, l]));

  // --- Beneficiary lookup ---
  const allBenNames = customersInput
    .flatMap((c) =>
      isV2 && Array.isArray(c.loans)
        ? c.loans.flatMap((l) => (l.beneficiaries ?? []).map((b) => b.name))
        : [],
    )
    .filter(Boolean);
  const existingBens = await tx.beneficiary.findMany({
    where: { name: { in: allBenNames } },
    select: { id: true, loanId: true, name: true, accountNumber: true },
  });
  const benMap = new Map(
    existingBens.map((b) => [`${b.loanId}_${b.name}_${b.accountNumber ?? ""}`, b]),
  );

  // --- Invoice lookup ---
  const allInvoiceNumbers = customersInput
    .flatMap((c) => {
      if (!isV2 || !Array.isArray(c.loans)) return [];
      return c.loans.flatMap((l) => {
        if (!Array.isArray(l.disbursements)) return [];
        return l.disbursements.flatMap((d) => {
          const invs = Array.isArray(d.invoices) ? d.invoices.map((i) => i.invoiceNumber) : [];
          const lines = Array.isArray(d.beneficiaryLines)
            ? d.beneficiaryLines.flatMap((bl) =>
                Array.isArray(bl.invoices) ? bl.invoices.map((i) => i.invoiceNumber) : [],
              )
            : [];
          return [...invs, ...lines];
        });
      });
    })
    .filter(Boolean);
  const existingInvoices = await tx.invoice.findMany({
    where: { invoiceNumber: { in: allInvoiceNumbers } },
    select: { id: true, invoiceNumber: true, supplierName: true },
  });
  const invoiceMap = new Map(existingInvoices.map((i) => [`${i.invoiceNumber}_${i.supplierName}`, i]));

  return { customerMap, loanMap, benMap, invoiceMap };
}

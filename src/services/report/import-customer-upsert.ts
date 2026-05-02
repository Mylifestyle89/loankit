/**
 * import-customer-upsert — upsert a single customer record inside a transaction.
 * Returns the resolved customerId (existing or newly created).
 */
import type { Prisma } from "@prisma/client";

import { hashCustomerCode } from "@/lib/field-encryption";

import type { ImportCustomerRecord } from "./_shared";

export async function upsertCustomer(
  tx: Prisma.TransactionClient,
  customerRaw: ImportCustomerRecord,
  customerMap: Map<string, { id: string; customer_code: string }>,
): Promise<string> {
  const existing = customerMap.get(customerRaw.customer_code);

  if (existing) {
    await tx.customer.update({
      where: { id: existing.id },
      data: {
        customer_name: customerRaw.customer_name ?? undefined,
        customer_type: customerRaw.customer_type ?? undefined,
        address: customerRaw.address,
        main_business: customerRaw.main_business,
        charter_capital: customerRaw.charter_capital,
        legal_representative_name: customerRaw.legal_representative_name,
        legal_representative_title: customerRaw.legal_representative_title,
        organization_type: customerRaw.organization_type,
        data_json: customerRaw.data_json,
      },
    });
    return existing.id;
  }

  const created = await tx.customer.create({
    data: {
      customer_code: customerRaw.customer_code,
      customer_code_hash: hashCustomerCode(customerRaw.customer_code),
      customer_name: customerRaw.customer_name,
      customer_type: customerRaw.customer_type ?? "corporate",
      address: customerRaw.address,
      main_business: customerRaw.main_business,
      charter_capital: customerRaw.charter_capital,
      legal_representative_name: customerRaw.legal_representative_name,
      legal_representative_title: customerRaw.legal_representative_title,
      organization_type: customerRaw.organization_type,
      data_json: customerRaw.data_json,
    },
  });
  customerMap.set(customerRaw.customer_code, {
    id: created.id,
    customer_code: customerRaw.customer_code,
  });
  return created.id;
}

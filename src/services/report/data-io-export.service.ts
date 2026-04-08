/**
 * Data-IO export — exportData and exportDataStream with full nested relations.
 */
import type { Prisma } from "@prisma/client";

import {
  decryptCoBorrowerPii,
  decryptCustomerPii,
  decryptRelatedPersonPii,
} from "@/lib/field-encryption";
import { prisma } from "@/lib/prisma";
import { loadState } from "@/lib/report/fs-store";

import { customerBatches, encode } from "./_shared";

// ---------------------------------------------------------------------------
// Full-include for v2 export (all nested relations)
// ---------------------------------------------------------------------------

const fullCustomerInclude = {
  loans: {
    include: {
      beneficiaries: true,
      disbursements: {
        include: {
          invoices: true,
          beneficiaryLines: {
            include: { invoices: true },
          },
        },
      },
    },
  },
  collaterals: true,
  loan_plans: true,
  co_borrowers: true,
  related_persons: true,
  credit_agribank: true,
  credit_other: true,
} satisfies Prisma.CustomerInclude;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cursor-based batch for customers with full relations (v2 export) */
async function* fullCustomerBatches(
  where?: Prisma.CustomerWhereInput,
  batchSize = 100,
): AsyncGenerator<Record<string, unknown>[]> {
  let cursorId: string | undefined = undefined;

  while (true) {
    const rows: Record<string, unknown>[] = await prisma.customer.findMany({
      where,
      include: fullCustomerInclude,
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
    });

    if (rows.length === 0) break;
    yield rows.map(decryptFullCustomer);
    cursorId = rows[rows.length - 1].id as string;
  }
}

/** Decrypt PII on the Customer row and every nested CoBorrower/
 *  RelatedPerson so the export contains plaintext values. */
function decryptFullCustomer<T extends Record<string, unknown>>(row: T): T {
  const customer = decryptCustomerPii(row);
  const coBorrowers = Array.isArray((customer as Record<string, unknown>).co_borrowers)
    ? ((customer as Record<string, unknown>).co_borrowers as Array<Record<string, unknown>>).map(decryptCoBorrowerPii)
    : (customer as Record<string, unknown>).co_borrowers;
  const relatedPersons = Array.isArray((customer as Record<string, unknown>).related_persons)
    ? ((customer as Record<string, unknown>).related_persons as Array<Record<string, unknown>>).map(decryptRelatedPersonPii)
    : (customer as Record<string, unknown>).related_persons;
  return { ...customer, co_borrowers: coBorrowers, related_persons: relatedPersons } as T;
}

// ---------------------------------------------------------------------------
// Export functions
// ---------------------------------------------------------------------------

export async function exportData(params?: { customerIds?: string[]; templateIds?: string[] }) {
  const customerIds = Array.isArray(params?.customerIds) ? params.customerIds : [];
  const templateIds = Array.isArray(params?.templateIds) ? params.templateIds : [];
  const where: Prisma.CustomerWhereInput | undefined =
    customerIds.length > 0 ? { id: { in: customerIds } } : undefined;

  const rawCustomers = await prisma.customer.findMany({
    where,
    include: fullCustomerInclude,
  });
  const customers = rawCustomers.map(decryptFullCustomer);

  const state = await loadState();
  const field_templates =
    templateIds.length > 0
      ? (state.field_templates || []).filter((t) => templateIds.includes(t.id))
      : state.field_templates || [];

  return {
    version: "2.0",
    exported_at: new Date().toISOString(),
    customers,
    field_templates,
    field_catalog: state.field_catalog || [],
  };
}

export async function exportDataStream(params?: {
  customerIds?: string[];
  templateIds?: string[];
  includeRelations?: boolean;
}) {
  const state = await loadState();
  const templateIds = Array.isArray(params?.templateIds) ? params.templateIds : [];
  const customerIds = Array.isArray(params?.customerIds) ? params.customerIds : [];
  const includeRelations = params?.includeRelations ?? true;
  const fieldTemplates =
    templateIds.length > 0
      ? (state.field_templates || []).filter((t) => templateIds.includes(t.id))
      : state.field_templates || [];

  const where: Prisma.CustomerWhereInput | undefined =
    customerIds.length > 0 ? { id: { in: customerIds } } : undefined;
  const version = includeRelations ? "2.0" : "1.0";

  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      try {
        controller.enqueue(
          encode(`{"version":"${version}","exported_at":"${new Date().toISOString()}","customers":[`),
        );
        let first = true;

        if (includeRelations) {
          for await (const batch of fullCustomerBatches(where, 100)) {
            for (const customer of batch) {
              const chunk = `${first ? "" : ","}${JSON.stringify(customer)}`;
              controller.enqueue(encode(chunk));
              first = false;
            }
          }
        } else {
          for await (const batch of customerBatches(where, 500)) {
            for (const customer of batch) {
              const chunk = `${first ? "" : ","}${JSON.stringify(customer)}`;
              controller.enqueue(encode(chunk));
              first = false;
            }
          }
        }

        controller.enqueue(
          encode(
            `],"field_templates":${JSON.stringify(fieldTemplates)},"field_catalog":${JSON.stringify(state.field_catalog || [])}}`,
          ),
        );
        controller.close();
      } catch (error) {
        // Surface stream failures loudly instead of truncating silently to an
        // empty body — callers still see the partial chunks that were already
        // flushed, and the error hits server logs.
        console.error("[exportDataStream] failed:", error);
        controller.error(error);
      }
    },
  });
  return stream;
}

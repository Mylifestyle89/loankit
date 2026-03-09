/**
 * Data-IO service — import/export customers & field templates.
 */
import type { Customer, Prisma } from "@prisma/client";

import { ValidationError } from "@/core/errors/app-error";
import { prisma } from "@/lib/prisma";
import { loadState, saveState } from "@/lib/report/fs-store";

import {
  type ImportCustomerRecord,
  type ImportTemplateRecord,
  customerBatches,
  encode,
} from "./_shared";

// ---------------------------------------------------------------------------
// Data-IO Service
// ---------------------------------------------------------------------------

export const dataIoService = {
  async importData(input: { version?: unknown; customers?: unknown[]; field_templates?: unknown[] }) {
    if (!input.version || !Array.isArray(input.customers) || !Array.isArray(input.field_templates)) {
      throw new ValidationError("Định dạng file không hợp lệ");
    }
    const customersInput = input.customers as ImportCustomerRecord[];
    const fieldTemplatesInput = input.field_templates as ImportTemplateRecord[];

    let customersImported = 0;
    await prisma.$transaction(async (tx) => {
      for (const customer of customersInput) {
        const existing = await tx.customer.findUnique({
          where: { customer_code: customer.customer_code },
        });
        if (existing) {
          await tx.customer.update({
            where: { id: existing.id },
            data: {
              customer_name: customer.customer_name ?? existing.customer_name,
              address: customer.address,
              main_business: customer.main_business,
              charter_capital: customer.charter_capital,
              legal_representative_name: customer.legal_representative_name,
              legal_representative_title: customer.legal_representative_title,
              organization_type: customer.organization_type,
              data_json: customer.data_json,
            },
          });
        } else {
          await tx.customer.create({
            data: {
              customer_code: customer.customer_code,
              customer_name: customer.customer_name,
              address: customer.address,
              main_business: customer.main_business,
              charter_capital: customer.charter_capital,
              legal_representative_name: customer.legal_representative_name,
              legal_representative_title: customer.legal_representative_title,
              organization_type: customer.organization_type,
              data_json: customer.data_json,
            },
          });
        }
        customersImported += 1;
      }
    });

    const state = await loadState();
    const existingTemplatesMap = new Map((state.field_templates || []).map((t) => [t.id, t]));
    for (const tpl of fieldTemplatesInput) {
      existingTemplatesMap.set(tpl.id, tpl);
    }
    state.field_templates = Array.from(existingTemplatesMap.values());
    await saveState(state);

    return { customers: customersImported, templates: fieldTemplatesInput.length };
  },

  async exportData(params?: { customerIds?: string[]; templateIds?: string[] }) {
    const customerIds = Array.isArray(params?.customerIds) ? params.customerIds : [];
    const templateIds = Array.isArray(params?.templateIds) ? params.templateIds : [];
    const customers: Customer[] =
      customerIds.length > 0
        ? await prisma.customer.findMany({ where: { id: { in: customerIds } } })
        : await prisma.customer.findMany();

    const state = await loadState();
    const field_templates =
      templateIds.length > 0
        ? (state.field_templates || []).filter((t) => templateIds.includes(t.id))
        : state.field_templates || [];

    return {
      version: "1.0",
      exported_at: new Date().toISOString(),
      customers,
      field_templates,
      field_catalog: state.field_catalog || [],
    };
  },

  async exportDataStream(params?: { customerIds?: string[]; templateIds?: string[] }) {
    const state = await loadState();
    const templateIds = Array.isArray(params?.templateIds) ? params.templateIds : [];
    const customerIds = Array.isArray(params?.customerIds) ? params.customerIds : [];
    const fieldTemplates =
      templateIds.length > 0
        ? (state.field_templates || []).filter((t) => templateIds.includes(t.id))
        : state.field_templates || [];

    const where: Prisma.CustomerWhereInput | undefined = customerIds.length > 0 ? { id: { in: customerIds } } : undefined;
    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        controller.enqueue(
          encode(
            `{"version":"1.0","exported_at":"${new Date().toISOString()}","customers":[`,
          ),
        );
        let first = true;
        for await (const batch of customerBatches(where, 500)) {
          for (const customer of batch) {
            const chunk = `${first ? "" : ","}${JSON.stringify(customer)}`;
            controller.enqueue(encode(chunk));
            first = false;
          }
        }
        controller.enqueue(encode(`],"field_templates":${JSON.stringify(fieldTemplates)},"field_catalog":${JSON.stringify(state.field_catalog || [])}}`));
        controller.close();
      },
    });
    return stream;
  },
};

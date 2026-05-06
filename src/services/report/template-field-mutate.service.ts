/**
 * Field-template mutation operations — create, update, attach for field templates.
 * Phase 6h: removed _migration-internals, MappingInstance creation, FS legacy branches.
 * Always DB mode now. attachTemplateToCustomer broadcasts via loan.masterTemplateId.
 */
import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import { prisma } from "@/lib/prisma";
import { fieldCatalogItemSchema } from "@/lib/report/config-schema";

import {
  mapMasterTemplateRecordToSummary,
  toJsonString,
} from "./_shared";

export async function createFieldTemplate(input: {
  name: string;
  fieldCatalog: unknown[];
  customerId?: string;
  createdBy?: string;
}) {
  const name = (input.name ?? "").trim();
  if (!name) throw new ValidationError("Template name is required.");
  if (!Array.isArray(input.fieldCatalog)) throw new ValidationError("field_catalog must be an array.");
  const parsedCatalog = input.fieldCatalog.map((item) => fieldCatalogItemSchema.parse(item));

  const master = await prisma.masterTemplate.create({
    data: {
      name,
      status: "active",
      fieldCatalogJson: JSON.stringify(parsedCatalog),
    },
  });

  // If customerId provided, broadcast master to all customer loans (Q4-a pattern)
  if (input.customerId) {
    await prisma.loan.updateMany({
      where: { customerId: input.customerId },
      data: { masterTemplateId: master.id },
    });
  }

  const created = mapMasterTemplateRecordToSummary(master);
  const allMasters = await prisma.masterTemplate.findMany({ orderBy: { createdAt: "desc" } });
  return { template: created, allTemplates: allMasters.map((item) => mapMasterTemplateRecordToSummary(item)) };
}

export async function updateFieldTemplate(input: {
  templateId: string;
  name?: string;
  fieldCatalog: unknown[];
}) {
  const templateId = input.templateId.trim();
  if (!templateId) throw new ValidationError("template_id is required.");
  if (!Array.isArray(input.fieldCatalog)) throw new ValidationError("field_catalog must be an array.");

  const nextName = (input.name ?? "").trim();
  const parsedCatalog = input.fieldCatalog.map((item) => fieldCatalogItemSchema.parse(item));

  const master = await prisma.masterTemplate.findUnique({ where: { id: templateId } });
  if (!master) throw new NotFoundError("Field template not found.");

  const updated = await prisma.masterTemplate.update({
    where: { id: templateId },
    data: {
      ...(nextName ? { name: nextName } : {}),
      fieldCatalogJson: JSON.stringify(parsedCatalog),
    },
  });
  const allMasters = await prisma.masterTemplate.findMany({ orderBy: { createdAt: "desc" } });
  return {
    updated: mapMasterTemplateRecordToSummary(updated),
    allTemplates: allMasters.map((item) => mapMasterTemplateRecordToSummary(item)),
  };
}

/**
 * Attaches a master template to a customer by setting loan.masterTemplateId
 * for all loans belonging to that customer (Q4-a broadcast pattern).
 */
export async function attachTemplateToCustomer(input: { customerId: string; templateId: string }) {
  const customerId = input.customerId.trim();
  const templateId = input.templateId.trim();
  if (!customerId || !templateId) throw new ValidationError("customer_id and template_id are required.");

  const [customer, master] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.masterTemplate.findUnique({ where: { id: templateId } }),
  ]);
  if (!customer) throw new NotFoundError("Customer not found.");
  if (!master) throw new NotFoundError("Master template not found.");

  const result = await prisma.loan.updateMany({
    where: { customerId },
    data: { masterTemplateId: master.id },
  });

  return { template_id: master.id, customer_id: customerId, updated_loan_count: result.count };
}

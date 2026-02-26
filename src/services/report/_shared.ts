/**
 * Shared helpers & types used across report sub-services.
 * Keep this module free of heavy business logic — only pure mappers,
 * parsers, and small utility functions belong here.
 */

import type { Customer, Prisma } from "@prisma/client";
import { z } from "zod";

import { SystemError, ValidationError } from "@/core/errors/app-error";
import {
  CorruptedTemplateError,
  DataPlaceholderMismatchError,
  TemplateNotFoundError,
} from "@/lib/docx-engine";
import { prisma } from "@/lib/prisma";
import {
  fieldCatalogItemSchema,
  type FieldCatalogItem,
  type FieldTemplate,
  type MappingInstanceSummary,
  type MasterTemplateSummary,
} from "@/lib/report/config-schema";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const LEGACY_MIGRATION_VERSION = 1;

// ---------------------------------------------------------------------------
// Pure utilities
// ---------------------------------------------------------------------------

export function parseCustomerDataJson(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function toJsonString(value: unknown): string {
  return JSON.stringify(value ?? {});
}

export function parseFieldCatalogJson(raw: string): FieldCatalogItem[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return z.array(fieldCatalogItemSchema).parse(parsed);
  } catch (error) {
    console.error("[Core] FieldCatalog Parsing Error:", error);
    return [];
  }
}

export function encode(data: string): Uint8Array {
  return new TextEncoder().encode(data);
}

export function sanitizeFilePart(input: unknown, fallback: string): string {
  const raw = String(input ?? "").trim();
  if (!raw) return fallback;

  const safe = raw
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  return safe || fallback;
}

export function resolveParentFromGroupedRecord(
  grouped: Record<string, unknown>,
  repeatKey: string,
): Record<string, unknown> {
  const parent = { ...grouped };
  const itemsRaw = parent[repeatKey];
  const items = Array.isArray(itemsRaw) ? (itemsRaw as Array<Record<string, unknown>>) : [];
  if (items.length > 0) {
    const first = items[0];
    for (const [k, v] of Object.entries(first)) {
      if (!(k in parent) || parent[k] === null || parent[k] === undefined || parent[k] === "") {
        parent[k] = v;
      }
    }
  }
  parent[repeatKey] = items;
  return parent;
}

// ---------------------------------------------------------------------------
// Record → Summary mappers
// ---------------------------------------------------------------------------

export function mapMasterTemplateRecordToSummary(input: {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  fieldCatalogJson: string;
}): MasterTemplateSummary {
  return {
    id: input.id,
    name: input.name,
    description: input.description ?? undefined,
    status: input.status === "archived" ? "archived" : "active",
    created_at: input.createdAt.toISOString(),
    updated_at: input.updatedAt.toISOString(),
    field_catalog: parseFieldCatalogJson(input.fieldCatalogJson),
  };
}

export function mapMappingInstanceRecordToSummary(input: {
  id: string;
  masterId: string | null;
  masterSnapshotName: string;
  fieldCatalogJson: string;
  customerId: string;
  name: string;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}): MappingInstanceSummary {
  return {
    id: input.id,
    master_id: input.masterId ?? undefined,
    master_snapshot_name: input.masterSnapshotName || undefined,
    field_catalog: parseFieldCatalogJson(input.fieldCatalogJson),
    customer_id: input.customerId,
    name: input.name,
    status: input.status === "published" ? "published" : input.status === "archived" ? "archived" : "draft",
    created_by: input.createdBy,
    created_at: input.createdAt.toISOString(),
    updated_at: input.updatedAt.toISOString(),
    published_at: input.publishedAt?.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// DOCX error mapper
// ---------------------------------------------------------------------------

export function mapDocxError(error: unknown): never {
  if (error instanceof TemplateNotFoundError) {
    throw new ValidationError(`Không tìm thấy file template: ${error.templatePath}`);
  }
  if (error instanceof CorruptedTemplateError) {
    throw new ValidationError(`File DOCX không hợp lệ hoặc bị hỏng: ${error.templatePath}`);
  }
  if (error instanceof DataPlaceholderMismatchError) {
    throw new ValidationError(`Dữ liệu không khớp placeholder của template: ${error.templatePath}`, error.details);
  }
  throw new SystemError("DOCX engine failed unexpectedly.", error);
}

// ---------------------------------------------------------------------------
// Mapping source resolution type
// ---------------------------------------------------------------------------

export type MappingSource =
  | { mode: "instance"; mappingPath: string; aliasPath: string; instanceId: string; mappingUpdatedAt: string }
  | { mode: "legacy"; mappingPath: string; aliasPath: string; versionId: string; mappingUpdatedAt: string };

export function sourceIdFromResolved(source: MappingSource): string {
  return source.mode === "instance" ? source.instanceId : source.versionId;
}

// ---------------------------------------------------------------------------
// Build meta types
// ---------------------------------------------------------------------------

export type BuildMeta = {
  built_at: string;
  mapping_source_mode: "instance" | "legacy";
  mapping_source_id: string;
  mapping_source_updated_at: string;
  template_profile_id: string;
};

export type BuildFreshness = {
  is_stale: boolean;
  reasons: string[];
  has_flat_draft: boolean;
  current_mapping_source_mode: "instance" | "legacy";
  current_mapping_source_id: string;
  current_mapping_updated_at: string;
  last_build_at?: string;
};

// ---------------------------------------------------------------------------
// Import/Export types
// ---------------------------------------------------------------------------

export type ImportCustomerRecord = {
  customer_code: string;
  customer_name: string;
  address: string | null;
  main_business: string | null;
  charter_capital: number | null;
  legal_representative_name: string | null;
  legal_representative_title: string | null;
  organization_type: string | null;
  data_json: string | null;
};

export type ImportTemplateRecord = FieldTemplate;

// ---------------------------------------------------------------------------
// Cursor-based batch helper (tối ưu cho dữ liệu lớn)
// ---------------------------------------------------------------------------

export async function* customerBatches(
  where?: Prisma.CustomerWhereInput,
  batchSize = 500,
): AsyncGenerator<Customer[]> {
  let cursorId: string | undefined = undefined;

  while (true) {
    const rows: Customer[] = await prisma.customer.findMany({
      where,
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
    });

    if (rows.length === 0) break;

    yield rows;
    cursorId = rows[rows.length - 1].id;
  }
}

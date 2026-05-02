/**
 * shared-record-mappers.ts
 * Record → Summary mapper functions for MasterTemplate and MappingInstance.
 * Extracted from _shared.ts to keep that module under 200 LOC.
 */

import {
  type MappingInstanceSummary,
  type MasterTemplateSummary,
} from "@/lib/report/config-schema";
import { parseFieldCatalogJson } from "./_shared";

// ---------------------------------------------------------------------------
// Mappers
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
    status:
      input.status === "published"
        ? "published"
        : input.status === "archived"
          ? "archived"
          : "draft",
    created_by: input.createdBy,
    created_at: input.createdAt.toISOString(),
    updated_at: input.updatedAt.toISOString(),
    published_at: input.publishedAt?.toISOString(),
  };
}

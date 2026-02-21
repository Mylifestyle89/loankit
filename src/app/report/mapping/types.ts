import type { FieldCatalogItem } from "@/lib/report/config-schema";

export type MappingApiResponse = {
  ok: boolean;
  error?: string;
  active_version_id?: string;
  versions?: Array<{ id: string; status: "draft" | "published"; created_at: string; notes?: string }>;
  mapping?: unknown;
  alias_map?: unknown;
};

export type ValidationResponse = {
  ok: boolean;
  error?: string;
  validation?: {
    is_valid?: boolean;
    errors_count?: number;
    warnings_count?: number;
    errors?: unknown[];
    warnings?: unknown[];
  };
};

export type ValuesResponse = {
  ok: boolean;
  error?: string;
  field_catalog?: FieldCatalogItem[];
  auto_values?: Record<string, unknown>;
  values?: Record<string, unknown>;
  manual_values?: Record<string, string | number | boolean | null>;
};

export type FieldTemplateItem = {
  id: string;
  name: string;
  created_at: string;
  field_catalog: FieldCatalogItem[];
};

export type FieldTemplatesResponse = {
  ok: boolean;
  error?: string;
  field_templates?: FieldTemplateItem[];
  field_template?: FieldTemplateItem;
};

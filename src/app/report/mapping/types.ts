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
  field_formulas?: Record<string, string>;
};

export type FieldTemplateItem = {
  id: string;
  name: string;
  created_at: string;
  field_catalog: FieldCatalogItem[];
  assigned_customer_count?: number;
};

export type FieldTemplatesResponse = {
  ok: boolean;
  error?: string;
  field_templates?: FieldTemplateItem[];
  field_template?: FieldTemplateItem;
};

export type MappingSuggestResponse = {
  ok: boolean;
  error?: string;
  suggestion?: Record<string, string>;
  grouping?: {
    groupKey: string;
    repeatKey: string;
  };
};

export type AutoProcessProgress = {
  current: number;
  total: number;
  percent: number;
  currentLabel: string;
};

export type AutoProcessRootCandidate = {
  key: string;
  uniqueRatio: number;
  nonEmptyRatio: number;
  score: number;
};

export type AutoProcessJob = {
  job_id: string;
  phase: "idle" | "analyzing" | "ready" | "running" | "completed" | "failed";
  message: string;
  excel_path: string;
  template_path: string;
  job_type: string;
  headers: string[];
  placeholders: string[];
  mapping: Record<string, string>;
  suggested_root_key: string;
  root_candidates: AutoProcessRootCandidate[];
  repeat_key: string;
  customer_name_key: string | null;
  output_dir: string | null;
  output_paths: string[];
  warnings: string[];
  error: string | null;
  progress: AutoProcessProgress;
  created_at: string;
  updated_at: string;
};

export type AutoProcessAssetsResponse = {
  ok: boolean;
  error?: string;
  excel_files?: string[];
  template_files?: string[];
};

export type AutoProcessUploadResponse = {
  ok: boolean;
  error?: string;
  path?: string;
  name?: string;
};

export type AutoProcessJobResponse = {
  ok: boolean;
  error?: string;
  job?: AutoProcessJob;
};

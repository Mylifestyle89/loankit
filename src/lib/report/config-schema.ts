import { z } from "zod";

export const mappingSourceSchema = z.object({
  source: z.string().min(1),
  path: z.string().min(1),
  note: z.string().optional(),
});

export const mappingItemSchema = z.object({
  template_field: z.string().min(1),
  status: z.string().default("READY"),
  priority: z.string().optional(),
  normalizer: z.string().optional(),
  sources: z.array(mappingSourceSchema).default([]),
});

export const mappingMasterSchema = z.object({
  version: z.string().default("1.0.0"),
  scope: z.string().default("Mau 02A/BCDX-PN"),
  sources: z.record(z.string(), z.record(z.string(), z.any())),
  priority_policy: z.record(z.string(), z.any()).default({}),
  normalizers: z.record(z.string(), z.any()).default({}),
  mappings: z.array(mappingItemSchema),
});

export const aliasValueSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.object({
    literal: z.any().optional(),
    from: z.union([z.string(), z.array(z.string())]).optional(),
  }),
]);

export const aliasMapSchema = z.record(z.string(), aliasValueSchema);

export const fieldCatalogItemSchema = z.object({
  field_key: z.string().min(1),
  label_vi: z.string().min(1),
  group: z.string().min(1),
  type: z.enum(["text", "number", "percent", "date", "table"]).default("text"),
  required: z.boolean().default(false),
  normalizer: z.string().optional(),
  examples: z.array(z.string()).default([]),
});

export const mappingVersionSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["draft", "published"]).default("draft"),
  created_by: z.string().default("system"),
  created_at: z.string().min(1),
  mapping_json_path: z.string().min(1),
  alias_json_path: z.string().min(1),
  notes: z.string().default(""),
});

export const templateProfileSchema = z.object({
  id: z.string().min(1),
  template_name: z.string().min(1),
  docx_path: z.string().min(1),
  placeholder_inventory_path: z.string().default(""),
  active: z.boolean().default(false),
});

export const runLogSchema = z.object({
  run_id: z.string().min(1),
  mapping_version_id: z.string().min(1),
  template_profile_id: z.string().min(1),
  result_summary: z.record(z.string(), z.any()).default({}),
  output_paths: z.array(z.string()).default([]),
  duration_ms: z.number().nonnegative().default(0),
  created_at: z.string().min(1),
});

export const frameworkStateSchema = z.object({
  field_catalog: z.array(fieldCatalogItemSchema).default([]),
  mapping_versions: z.array(mappingVersionSchema).default([]),
  template_profiles: z.array(templateProfileSchema).default([]),
  run_logs: z.array(runLogSchema).default([]),
  active_mapping_version_id: z.string().optional(),
  active_template_id: z.string().optional(),
});

export type MappingMaster = z.infer<typeof mappingMasterSchema>;
export type AliasMap = z.infer<typeof aliasMapSchema>;
export type FieldCatalogItem = z.infer<typeof fieldCatalogItemSchema>;
export type MappingVersion = z.infer<typeof mappingVersionSchema>;
export type TemplateProfile = z.infer<typeof templateProfileSchema>;
export type RunLog = z.infer<typeof runLogSchema>;
export type FrameworkState = z.infer<typeof frameworkStateSchema>;

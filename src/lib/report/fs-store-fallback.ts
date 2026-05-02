/**
 * fs-store-fallback.ts
 * Bootstrap and fallback recovery logic for FrameworkState when DB is empty
 * or filesystem is unavailable. Extracted from fs-store.ts to keep it <200 LOC.
 */
import path from "node:path";

import {
  frameworkStateSchema,
  type FrameworkState,
  type MappingVersion,
  type TemplateProfile,
} from "@/lib/report/config-schema";
import {
  DEFAULT_ALIAS_FILE,
  DEFAULT_MAPPING_FILE,
  DEFAULT_TEMPLATE_FILE,
} from "@/lib/report/constants";
import { buildCatalog, readAliasFile, readMappingFile } from "@/lib/report/fs-store-mapping-io";

// ---------------------------------------------------------------------------
// Default template profiles
// ---------------------------------------------------------------------------

export function bootstrapTemplateProfiles(): TemplateProfile[] {
  return [
    {
      id: "template-2268-no-prefix",
      template_name: "Mau 2268 (no prefix placeholders)",
      docx_path: DEFAULT_TEMPLATE_FILE,
      placeholder_inventory_path: "",
      active: true,
    },
    {
      id: "template-2268-original",
      template_name: "Mau 2268 (original)",
      docx_path: "report_assets/2268.02A.PN BC de xuat cho vay ngan han.docx",
      placeholder_inventory_path: "",
      active: false,
    },
  ];
}

// ---------------------------------------------------------------------------
// Bootstrap: build initial FrameworkState from mapping/alias files on disk
// ---------------------------------------------------------------------------

export async function bootstrapState(): Promise<FrameworkState> {
  const mapping = await readMappingFile(DEFAULT_MAPPING_FILE);
  const versionId = `bootstrap-${Date.now()}`;
  const draftMappingPath = `report_assets/config/versions/${versionId}.mapping.json`;
  const draftAliasPath = `report_assets/config/versions/${versionId}.alias.json`;

  const { writeJsonFile } = await import("@/lib/report/fs-store-helpers");
  await writeJsonFile(path.join(process.cwd(), draftMappingPath), mapping);
  const alias = await readAliasFile(DEFAULT_ALIAS_FILE);
  await writeJsonFile(path.join(process.cwd(), draftAliasPath), alias);

  const mappingVersion: MappingVersion = {
    id: versionId,
    status: "published",
    created_by: "system",
    created_at: new Date().toISOString(),
    mapping_json_path: draftMappingPath,
    alias_json_path: draftAliasPath,
    notes: "Bootstrap from existing report assets.",
  };

  const state: FrameworkState = {
    field_catalog: buildCatalog(mapping),
    field_templates: [],
    mapping_versions: [mappingVersion],
    template_profiles: bootstrapTemplateProfiles(),
    run_logs: [],
    active_mapping_version_id: versionId,
    active_template_id: "template-2268-no-prefix",
  };
  return frameworkStateSchema.parse(state);
}

// ---------------------------------------------------------------------------
// Empty state sentinel (used when FS is read-only and DB is empty)
// ---------------------------------------------------------------------------

export const EMPTY_STATE: FrameworkState = frameworkStateSchema.parse({
  field_catalog: [],
  field_templates: [],
  mapping_versions: [],
  template_profiles: [],
  run_logs: [],
  active_mapping_version_id: "",
  active_template_id: "",
});

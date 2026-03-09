import path from "node:path";

export const REPORT_ASSETS_DIR = path.join(process.cwd(), "report_assets");
export const REPORT_CONFIG_DIR = path.join(REPORT_ASSETS_DIR, "config");
export const REPORT_STATE_FILE = path.join(REPORT_CONFIG_DIR, "framework_state.json");
export const REPORT_VERSIONS_DIR = path.join(REPORT_CONFIG_DIR, "versions");
export const REPORT_INVENTORY_DIR = path.join(REPORT_CONFIG_DIR, "inventories");
export const REPORT_MANUAL_VALUES_FILE = path.join(REPORT_CONFIG_DIR, "manual_values.json");
export const REPORT_FIELD_FORMULAS_FILE = path.join(REPORT_CONFIG_DIR, "field_formulas.json");
export const REPORT_MERGED_FLAT_FILE = path.join(REPORT_CONFIG_DIR, "merged_report_draft_flat.json");
export const REPORT_BUILD_META_FILE = path.join(REPORT_CONFIG_DIR, "build_meta.json");

export const DEFAULT_MAPPING_FILE = "report_assets/config/mapping_master.json";
export const DEFAULT_ALIAS_FILE = "report_assets/config/placeholder_alias_2268.json";
export const DEFAULT_TEMPLATE_FILE = "report_assets/2268_no_prefix_placeholders.docx";

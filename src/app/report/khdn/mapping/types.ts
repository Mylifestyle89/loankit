import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { TypeLabelMap } from "./helpers";

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

export type MasterTemplateItem = {
  id: string;
  name: string;
  description?: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
  field_catalog: FieldCatalogItem[];
  assigned_customer_count?: number;
};

export type MappingInstanceItem = {
  id: string;
  master_id?: string;
  master_snapshot_name?: string;
  field_catalog: FieldCatalogItem[];
  customer_id: string;
  name: string;
  status: "draft" | "published" | "archived";
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
};

export type ReverseTagSuggestion = {
  originalText: string;
  proposedTag: string;
  contextSnippet: string;
  confidenceScore: number;
  paragraphIndex?: number;
  sourceHeader?: string;
  normalizedSignals?: string[];
};

export type FieldTemplatesResponse = {
  ok: boolean;
  error?: string;
  field_templates?: FieldTemplateItem[];
  field_template?: FieldTemplateItem;
  master_templates?: MasterTemplateItem[];
  master_template?: MasterTemplateItem;
  mapping_instances?: MappingInstanceItem[];
  mapping_instance?: MappingInstanceItem;
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

export type OcrSuggestionStatus = "pending" | "accepted" | "declined";
export type ExtractSuggestionSource = "ocr_ai" | "docx_ai";

export type OcrFieldSuggestionItem = {
  fieldKey: string;
  proposedValue: string;
  confidenceScore: number;
  status: OcrSuggestionStatus;
  source: ExtractSuggestionSource;
};

export type OcrSuggestionMap = Record<string, OcrFieldSuggestionItem>;

export type RepeaterSuggestionItem = {
  groupPath: string;
  fieldKeys: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
  confidenceScore: number;
  status?: OcrSuggestionStatus;
  source?: ExtractSuggestionSource;
};

export type OcrProcessResponse = {
  ok: boolean;
  error?: string;
  suggestions?: Array<{
    fieldKey: string;
    proposedValue: string;
    confidenceScore: number;
    source?: ExtractSuggestionSource;
  }>;
  repeaterSuggestions?: RepeaterSuggestionItem[];
  meta?: {
    provider: "tesseract" | "vision" | "docx_ai";
    extractedTextLength: number;
    masked: true;
    paragraphCount?: number;
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

export type FieldEditState = {
  label_vi: string;
  group: string;
  type: "string" | "number" | "percent" | "date" | "table";
};

export type UndoSnapshot = {
  fieldCatalog: import("@/lib/report/config-schema").FieldCatalogItem[];
  values: Record<string, unknown>;
  manualValues: Record<string, string | number | boolean | null>;
  formulas: Record<string, string>;
  customGroups: string[];
  selectedGroup: string;
  newField: FieldEditState;
  mappingText: string;
  collapsedParentGroups: string[];
};

export type OcrLogEntry = {
  id: string;
  message: string;
  createdAt: number;
  type: "ai" | "system" | "error";
};

export type RepeaterSuggestionMap = Record<
  string,
  {
    groupPath: string;
    fieldKeys: string[];
    rows: Array<Record<string, string | number | boolean | null>>;
    confidenceScore: number;
    status: "pending" | "accepted" | "declined";
    source: "docx_ai";
  }
>;

export type ImportGroupPrompt = {
  rowNumber: number;
  missingPath: string;
  level: "parent" | "subgroup";
} | null;

// ─── Field Catalog component prop group types ───────────────────────────────

/** Read-only view data shared between FieldCatalogBoard and FieldCatalogGroupSection */
export type CatalogViewData = {
  values: Record<string, unknown>;
  fieldCatalog: FieldCatalogItem[];
  showTechnicalKeys: boolean;
  typeLabels: TypeLabelMap;
  formulas: Record<string, string>;
  confidenceByField: Record<string, number>;
  sampleByField: Record<string, string>;
  ocrSuggestionsByField: OcrSuggestionMap;
};

/** Group-level actions for FieldCatalogBoard (superset of what GroupSection needs) */
export type CatalogGroupActions = {
  collapseAllGroups: () => void;
  expandAllGroups: () => void;
  onOpenAddFieldModal: () => void;
  openCreateSubgroupModal: (parentGroup: string) => void;
  toggleParentCollapse: (parent: string) => void;
  toggleRepeaterGroup: (groupPath: string) => void;
  prepareAddFieldForGroup: (groupPath: string) => void;
  openEditGroupModal: (group: string) => void;
  onDeleteGroup: (groupPath: string) => void;
};

/** Field-level actions shared between FieldCatalogBoard and FieldCatalogGroupSection */
export type CatalogFieldActions = {
  onRepeaterItemChange: (groupPath: string, index: number, field: FieldCatalogItem, rawVal: string) => void;
  onManualChange: (field: FieldCatalogItem, rawValue: string) => void;
  removeRepeaterItem: (groupPath: string, index: number) => void;
  addRepeaterItem: (groupPath: string) => void;
  onFieldLabelChange: (fieldKey: string, labelVi: string) => void;
  onFieldTypeChange: (fieldKey: string, type: FieldCatalogItem["type"]) => void;
  onMoveField: (fieldKey: string, direction: "up" | "down") => void;
  onOpenChangeGroupModal: (fieldKey: string) => void;
  onDeleteField: (fieldKey: string) => void;
  onOpenFormulaModal: (fieldKey: string) => void;
  onAcceptOcrSuggestion: (fieldKey: string) => void;
  onDeclineOcrSuggestion: (fieldKey: string) => void;
};

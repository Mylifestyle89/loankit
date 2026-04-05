// Types, interfaces, and style constants for AiMappingModal

import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { AutoProcessJob } from "../../types";

export type ModalSection = "suggest" | "batch" | "tagging" | "financial" | "bk";

/** Result shape from BK file import parsing */
export type BkImportResult = {
  values: Record<string, string>;
  metadata?: { sourceFile?: string };
};

export type ChipVariant = "single" | "repeater" | "root";

export type Props = {
  isOpen: boolean;
  onClose: () => void;
  placeholders: string[];
  placeholderLabels?: Record<string, string>;
  onApply: (payload: { suggestion: Record<string, string>; grouping?: { groupKey: string; repeatKey: string } }) => void;
  onSmartAutoBatch: (input: { excelPath: string; templatePath: string; rootKeyOverride?: string; jobType?: string }) => Promise<void>;
  onLoadAssetOptions: () => Promise<{ excelFiles: string[]; templateFiles: string[] }>;
  onUploadFile: (file: File, kind: "data" | "template") => Promise<string>;
  autoProcessJob: AutoProcessJob | null;
  autoProcessing: boolean;
  onOpenOutputFolder: () => Promise<void>;
  onDownloadAllAsZip?: (paths: string[]) => Promise<void>;
  t: (key: string) => string;
  /** Cho tab Phân tích tài chính (nhúng trong modal AI). */
  fieldCatalog?: FieldCatalogItem[];
  onApplyFinancialValues?: (values: Record<string, string>) => void;
  /** Cho tab BK Import — hỗ trợ 2 mode: data-only / template-and-data. */
  onApplyBkImport?: (payload: {
    mode: "data-only" | "template-and-data";
    values: Record<string, string>;
    newFields?: FieldCatalogItem[];
    templateName?: string;
  }) => void;
  /** Áp dụng matched fields vào field_catalog của field template đang chọn */
  onApplyToFieldTemplate?: (fields: FieldCatalogItem[]) => void;
};

export const chipStyles: Record<ChipVariant, { border: string; text: string; bg: string; icon: string }> = {
  single: {
    border: "border-amber-200/80 dark:border-amber-500/30",
    text: "text-amber-800 dark:text-amber-400",
    bg: "bg-amber-50/60 dark:bg-amber-500/10",
    icon: "text-amber-600 dark:text-amber-400",
  },
  repeater: {
    border: "border-amber-200/80",
    text: "text-amber-800",
    bg: "bg-amber-50/60",
    icon: "text-amber-600",
  },
  root: {
    border: "border-amber-200/80",
    text: "text-amber-800",
    bg: "bg-amber-50/60",
    icon: "text-amber-600",
  },
};

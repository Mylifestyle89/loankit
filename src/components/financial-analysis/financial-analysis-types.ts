// ─── Types for FinancialAnalysisModal ─────────────────────────────────────────

import type { BctcExtractResult } from "@/lib/bctc-extractor";
import type { FieldCatalogItem } from "@/lib/report/config-schema";

export type Step = 1 | 2 | 3 | 4;

export type QualitativeContext = {
  chatLuongHtk: string;
  congNoPhaiThu: string;
  hanMucTinDung: string;
  ghiChu: string;
};

// Dữ liệu phân tích gom vào 1 object → reset 1 lần duy nhất
export type AnalysisData = {
  bctcData: BctcExtractResult;
  fileName: string;
  originalAiValues: Record<string, string>; // Giá trị gốc AI trả về (không sửa)
  editedValues: Record<string, string>;     // Giá trị user có thể chỉnh sửa
  aiProvider: string;
};

export type FinancialAnalysisModalProps = {
  isOpen: boolean;
  onClose: () => void;
  fieldCatalog: FieldCatalogItem[];
  onApply?: (values: Record<string, string>) => void;
  /** Alias for onApply — KHDN compat */
  onApplyValues?: (values: Record<string, string>) => void;
  /** Render without overlay backdrop (embedded inside a parent modal) */
  embedded?: boolean;
  /** Enable framer-motion animations (default: false) */
  animated?: boolean;
  /** Show StepDots progress indicator instead of numbered step bar (default: false) */
  showStepDots?: boolean;
};

import type { FieldCatalogItem } from "@/lib/report/config-schema";

// Props type for FinancialAnalysisModal
export type FinancialAnalysisModalProps = {
  isOpen: boolean;
  onClose: () => void;
  fieldCatalog: FieldCatalogItem[];
  onApplyValues: (values: Record<string, string>) => void;
  /** Khi true: render nội dung bên trong modal cha (không overlay riêng), nút đóng thành "Quay lại". */
  embedded?: boolean;
};

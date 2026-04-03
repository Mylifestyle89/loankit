"use client";

import { useCallback } from "react";
import { useUiStore } from "../stores/use-ui-store";

/**
 * Toolbar action handlers for the Mapping page.
 * Extracted from useMappingPageLogic to keep that file under 300 lines.
 */
export interface UseMappingToolbarHandlersParams {
  selectedCustomerId: string | undefined;
  toolbarUploadRef: React.RefObject<HTMLInputElement | null>;
  saveEditedFieldTemplate: () => Promise<void>;
  promoteToMasterTemplate: () => Promise<void>;
}

export function useMappingToolbarHandlers({
  selectedCustomerId,
  toolbarUploadRef,
  saveEditedFieldTemplate,
  promoteToMasterTemplate,
}: UseMappingToolbarHandlersParams) {
  const handleOpenCustomerPicker = useCallback(() => {
    // Handled by caller via setCustomerPickerOpen
  }, []);

  const handleOpenTemplatePicker = useCallback(() => {
    // Handled by caller via setTemplatePickerOpen
  }, []);

  const handleUploadDocument = useCallback(
    () => toolbarUploadRef.current?.click(),
    [toolbarUploadRef],
  );

  const handleOpenFinancialAnalysis = useCallback(
    (setFinancialAnalysisOpen: (open: boolean) => void) => {
      if (!selectedCustomerId) {
        useUiStore.getState().setStatus({
          error: "Xin hãy chọn khách hàng trước khi sử dụng Phân tích tài chính.",
        });
        return;
      }
      setFinancialAnalysisOpen(true);
    },
    [selectedCustomerId],
  );

  const handleSaveEditedFieldTemplate = useCallback(
    () => void saveEditedFieldTemplate(),
    [saveEditedFieldTemplate],
  );

  const handlePromoteToMasterTemplate = useCallback(
    () => void promoteToMasterTemplate(),
    [promoteToMasterTemplate],
  );

  const handleOpenFormulaModal = useCallback(
    (fieldKey: string) => useUiStore.getState().setContext({ formulaFieldKey: fieldKey }),
    [],
  );

  return {
    handleOpenCustomerPicker,
    handleOpenTemplatePicker,
    handleUploadDocument,
    handleOpenFinancialAnalysis,
    handleSaveEditedFieldTemplate,
    handlePromoteToMasterTemplate,
    handleOpenFormulaModal,
  };
}

"use client";

import { useRef, useState, useCallback } from "react";
import { useOcrStore } from "../stores/use-ocr-store";
import { useUiStore } from "../stores/use-ui-store";

/**
 * Modal open/close local state + associated handlers for the Mapping page.
 * Extracted from useMappingPageLogic to keep that file under 300 lines.
 */
export function useMappingModalState() {
  const [financialAnalysisOpen, setFinancialAnalysisOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // Hidden file input for toolbar Upload button
  const toolbarUploadRef = useRef<HTMLInputElement>(null);
  const ocrLogEndRef = useRef<HTMLDivElement | null>(null);
  const openedAiSuggestionFromQueryRef = useRef(false);

  const handleOpenOcrReview = useCallback(
    () => useUiStore.getState().setModals({ ocrReview: true }),
    [],
  );

  const handleAcceptOcrSuggestion = useCallback(
    (fk: string) => void useOcrStore.getState().acceptSuggestion(fk),
    [],
  );

  const handleDeclineOcrSuggestion = useCallback(
    (fk: string) => useOcrStore.getState().declineSuggestion(fk),
    [],
  );

  return {
    financialAnalysisOpen, setFinancialAnalysisOpen,
    customerPickerOpen, setCustomerPickerOpen,
    templatePickerOpen, setTemplatePickerOpen,
    toolbarUploadRef,
    ocrLogEndRef,
    openedAiSuggestionFromQueryRef,
    handleOpenOcrReview,
    handleAcceptOcrSuggestion,
    handleDeclineOcrSuggestion,
  };
}

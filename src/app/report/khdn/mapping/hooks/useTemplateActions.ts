import { useTemplateDocxActions } from "./use-template-docx-actions";

export interface UseTemplateActionsProps {
  t: (key: string) => string;
  loadAllFieldTemplates: () => Promise<void>;
  loadFieldTemplates: (customerId: string) => Promise<void>;
  stopEditingFieldTemplate: () => void;
}

/**
 * Main template-actions hook — delegates to use-template-docx-actions.
 * Kept as thin wrapper for backward compat with useMappingPageLogic.
 */
export function useTemplateActions({
  t,
  loadAllFieldTemplates,
  loadFieldTemplates,
  stopEditingFieldTemplate,
}: UseTemplateActionsProps) {
  return useTemplateDocxActions({
    t,
    loadAllFieldTemplates,
    loadFieldTemplates,
    stopEditingFieldTemplate,
  });
}

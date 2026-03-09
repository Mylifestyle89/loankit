"use client";

import { useMemo } from "react";
import { useModalStore } from "@/lib/report/use-modal-store";
import { AiMappingModal } from "./Modals/AiMappingModal";
import { DeleteGroupConfirmModal } from "./Modals/DeleteGroupConfirmModal";
import { CreateMasterTemplateModal } from "./Modals/CreateMasterTemplateModal";

export function ModalRegistry() {
  const isAiOpen = useModalStore((s) => s.isOpen && s.view === "aiMapping");
  const aiData = useModalStore((s) => (s.view === "aiMapping" ? s.data : null));
  const closeModal = useModalStore((s) => s.closeModal);

  const aiPayload = useMemo(() => {
    if (!aiData || !("placeholders" in aiData)) return null;
    return aiData;
  }, [aiData]);

  return (
    <>
      {aiPayload ? (
        <AiMappingModal
          isOpen={Boolean(isAiOpen)}
          onClose={closeModal}
          placeholders={aiPayload.placeholders}
          placeholderLabels={aiPayload.placeholderLabels}
          onApply={aiPayload.onApply}
          onSmartAutoBatch={aiPayload.onSmartAutoBatch}
          onLoadAssetOptions={aiPayload.onLoadAssetOptions}
          onUploadFile={aiPayload.onUploadFile}
          autoProcessJob={aiPayload.autoProcessJob}
          autoProcessing={aiPayload.autoProcessing}
          onOpenOutputFolder={aiPayload.onOpenOutputFolder}
          onDownloadAllAsZip={aiPayload.onDownloadAllAsZip}
          t={aiPayload.t}
          fieldCatalog={aiPayload.fieldCatalog}
          onApplyFinancialValues={aiPayload.onApplyFinancialValues}
          onApplyBkImport={aiPayload.onApplyBkImport}
        />
      ) : null}
      <DeleteGroupConfirmModal />
      <CreateMasterTemplateModal />
    </>
  );
}


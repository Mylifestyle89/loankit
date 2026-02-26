"use client";

import { create } from "zustand";
import type { AutoProcessJob } from "@/app/report/mapping/types";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { ApplyAiSuggestionPayload } from "@/core/use-cases/apply-ai-suggestion";

export type DeleteGroupPayload = {
  groupPath: string;
  fieldCount: number;
  onConfirm: () => void | Promise<void>;
};

export type CreateMasterTemplatePayload = {
  initialName?: string;
  onSuccess?: (result: { id: string; name: string }) => void | Promise<void>;
  onError?: (message: string) => void;
};

export type AiMappingPayload = {
  placeholders: string[];
  placeholderLabels?: Record<string, string>;
  onApply: (payload: ApplyAiSuggestionPayload) => void;
  onSmartAutoBatch: (input: {
    excelPath: string;
    templatePath: string;
    rootKeyOverride?: string;
    jobType?: string;
  }) => Promise<void>;
  onLoadAssetOptions: () => Promise<{ excelFiles: string[]; templateFiles: string[] }>;
  onUploadFile: (file: File, kind: "data" | "template") => Promise<string>;
  autoProcessJob: AutoProcessJob | null;
  autoProcessing: boolean;
  onOpenOutputFolder: () => Promise<void>;
  onDownloadAllAsZip?: (paths: string[]) => Promise<void>;
  t: (key: string) => string;
  fieldCatalog?: FieldCatalogItem[];
  onApplyFinancialValues?: (values: Record<string, string>) => void;
};

export type ModalPayloadMap = {
  aiMapping: AiMappingPayload;
  deleteGroupConfirm: DeleteGroupPayload;
  createMasterTemplate: CreateMasterTemplatePayload;
};

export type ModalView = keyof ModalPayloadMap;

type ModalState = {
  isOpen: boolean;
  view: ModalView | null;
  data: ModalPayloadMap[ModalView] | null;
  openModal: <T extends ModalView>(view: T, data: ModalPayloadMap[T]) => void;
  closeModal: () => void;
};

export const useModalStore = create<ModalState>((set) => ({
  isOpen: false,
  view: null,
  data: null,
  openModal: (view, data) => set({ isOpen: true, view, data }),
  closeModal: () => set({ isOpen: false, view: null, data: null }),
}));

export function useModal() {
  const isOpen = useModalStore((s) => s.isOpen);
  const view = useModalStore((s) => s.view);
  const data = useModalStore((s) => s.data);
  const openModal = useModalStore((s) => s.openModal);
  const closeModal = useModalStore((s) => s.closeModal);
  return { isOpen, view, data, openModal, closeModal };
}


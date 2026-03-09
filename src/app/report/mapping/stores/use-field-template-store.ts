"use client";

import { create } from "zustand";
import type { FieldTemplateItem } from "../types";

type FieldTemplateState = {
  fieldTemplates: FieldTemplateItem[];
  allFieldTemplates: FieldTemplateItem[];
  loadingFieldTemplates: boolean;
  selectedFieldTemplateId: string;
  editingFieldTemplatePicker: boolean;
  editPickerTemplateId: string;
  editingFieldTemplateId: string;
  editingFieldTemplateName: string;
  savingEditedTemplate: boolean;
  promotingToMaster: boolean;
  setFieldTemplates: (templates: FieldTemplateItem[]) => void;
  setAllFieldTemplates: (templates: FieldTemplateItem[]) => void;
  setLoadingFieldTemplates: (loading: boolean) => void;
  setSelectedFieldTemplateId: (id: string) => void;
  setEditingFieldTemplatePicker: (open: boolean) => void;
  setEditPickerTemplateId: (id: string) => void;
  setEditingFieldTemplateId: (id: string) => void;
  setEditingFieldTemplateName: (name: string) => void;
  setSavingEditedTemplate: (saving: boolean) => void;
  setPromotingToMaster: (promoting: boolean) => void;
};

export const useFieldTemplateStore = create<FieldTemplateState>((set) => ({
  fieldTemplates: [],
  allFieldTemplates: [],
  loadingFieldTemplates: false,
  selectedFieldTemplateId: "",
  editingFieldTemplatePicker: false,
  editPickerTemplateId: "",
  editingFieldTemplateId: "",
  editingFieldTemplateName: "",
  savingEditedTemplate: false,
  promotingToMaster: false,
  setFieldTemplates: (fieldTemplates) => set({ fieldTemplates }),
  setAllFieldTemplates: (allFieldTemplates) => set({ allFieldTemplates }),
  setLoadingFieldTemplates: (loadingFieldTemplates) => set({ loadingFieldTemplates }),
  setSelectedFieldTemplateId: (selectedFieldTemplateId) => set({ selectedFieldTemplateId }),
  setEditingFieldTemplatePicker: (editingFieldTemplatePicker) =>
    set({ editingFieldTemplatePicker }),
  setEditPickerTemplateId: (editPickerTemplateId) => set({ editPickerTemplateId }),
  setEditingFieldTemplateId: (editingFieldTemplateId) => set({ editingFieldTemplateId }),
  setEditingFieldTemplateName: (editingFieldTemplateName) => set({ editingFieldTemplateName }),
  setSavingEditedTemplate: (savingEditedTemplate) => set({ savingEditedTemplate }),
  setPromotingToMaster: (promotingToMaster) => set({ promotingToMaster }),
}));

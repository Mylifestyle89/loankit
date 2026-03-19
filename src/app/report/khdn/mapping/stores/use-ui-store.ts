"use client";

import { create } from "zustand";
import type { FieldEditState, ImportGroupPrompt } from "../types";

/** Resolves a partial functional or direct update. Used for nested grouped setters. */
const resolvePartial = <T>(v: Partial<T> | ((prev: T) => Partial<T>), prev: T): Partial<T> =>
  typeof v === "function" ? v(prev) : v;

export type UiStatus = {
  loading: boolean;
  saving: boolean;
  message: string;
  error: string;
};

export type UiFilters = {
  searchTerm: string;
  showUnmappedOnly: boolean;
  showTechnicalKeys: boolean;
  selectedGroup: string;
};

export type UiModals = {
  addingField: boolean;
  importingCatalog: boolean;
  functionList: boolean;
  importGroup: boolean;
  ocrReview: boolean;
  deleteMaster: { open: boolean; typedName: string; loading: boolean };
};

export type UiContext = {
  newField: FieldEditState;
  formulaFieldKey: string | null;
  importGroupTemplateId: string;
  importGroupPath: string;
  importGroupPrompt: ImportGroupPrompt;
};

type UiState = {
  status: UiStatus;
  filters: UiFilters;
  modals: UiModals;
  context: UiContext;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setStatus: (v: Partial<UiStatus> | ((prev: UiStatus) => Partial<UiStatus>)) => void;
  setFilters: (v: Partial<UiFilters> | ((prev: UiFilters) => Partial<UiFilters>)) => void;
  setModals: (v: Partial<UiModals> | ((prev: UiModals) => Partial<UiModals>)) => void;
  setContext: (v: Partial<UiContext> | ((prev: UiContext) => Partial<UiContext>)) => void;
  resetUi: () => void;
};

const DEFAULT_NEW_FIELD: FieldEditState = { label_vi: "", group: "Nhóm mới", type: "string" };

const initialState = {
  status: { loading: true, saving: false, message: "", error: "" },
  filters: { searchTerm: "", showUnmappedOnly: false, showTechnicalKeys: false, selectedGroup: "" },
  modals: {
    addingField: false,
    importingCatalog: false,
    functionList: false,
    importGroup: false,
    ocrReview: false,
    deleteMaster: { open: false, typedName: "", loading: false },
  },
  context: {
    newField: DEFAULT_NEW_FIELD,
    formulaFieldKey: null,
    importGroupTemplateId: "",
    importGroupPath: "",
    importGroupPrompt: null,
  },
  sidebarOpen: false,
} satisfies Omit<UiState, "setSidebarOpen" | "toggleSidebar" | "setStatus" | "setFilters" | "setModals" | "setContext" | "resetUi">;

export const useUiStore = create<UiState>((set) => ({
  ...initialState,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setStatus: (v) => set((s) => ({ status: { ...s.status, ...resolvePartial(v, s.status) } })),
  setFilters: (v) => set((s) => ({ filters: { ...s.filters, ...resolvePartial(v, s.filters) } })),
  setModals: (v) => set((s) => ({ modals: { ...s.modals, ...resolvePartial(v, s.modals) } })),
  setContext: (v) => set((s) => ({ context: { ...s.context, ...resolvePartial(v, s.context) } })),
  resetUi: () => set(initialState),
}));

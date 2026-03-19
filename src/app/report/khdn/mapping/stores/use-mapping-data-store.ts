"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { MappingApiResponse, ValidationResponse } from "../types";

type MappingDataState = {
  mappingText: string;
  aliasText: string;
  validation: ValidationResponse["validation"] | undefined;
  activeVersionId: string;
  versions: MappingApiResponse["versions"];
  fieldCatalog: FieldCatalogItem[];
  autoValues: Record<string, unknown>;
  values: Record<string, unknown>;
  manualValues: Record<string, string | number | boolean | null>;
  formulas: Record<string, string>;
  setMappingText: (text: string | ((prev: string) => string)) => void;
  setAliasText: (text: string) => void;
  setValidation: (
    v:
      | ValidationResponse["validation"]
      | ((prev: ValidationResponse["validation"]) => ValidationResponse["validation"]),
  ) => void;
  setActiveVersionId: (id: string) => void;
  setVersions: (versions: MappingApiResponse["versions"]) => void;
  setFieldCatalog: (
    catalog: FieldCatalogItem[] | ((prev: FieldCatalogItem[]) => FieldCatalogItem[]),
  ) => void;
  setAutoValues: (values: Record<string, unknown>) => void;
  setValues: (
    values: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>),
  ) => void;
  setManualValues: (
    values:
      | Record<string, string | number | boolean | null>
      | ((
          prev: Record<string, string | number | boolean | null>,
        ) => Record<string, string | number | boolean | null>),
  ) => void;
  setFormulas: (
    formulas:
      | Record<string, string>
      | ((prev: Record<string, string>) => Record<string, string>),
  ) => void;
  /** Batch-apply a template selection: sets fieldCatalog, values, and manualValues in one update to avoid triple re-renders. */
  setTemplateData: (
    catalog: FieldCatalogItem[],
    values: Record<string, unknown>,
    manualValues: Record<string, string | number | boolean | null>,
  ) => void;
  /** True once Zustand has finished reading from localStorage (Next.js SSR-safe). */
  _hasHydrated: boolean;
  _setHasHydrated: (v: boolean) => void;
};

export const useMappingDataStore = create<MappingDataState>()(
  persist(
    (set) => ({
      mappingText: "",
      aliasText: "",
      validation: undefined,
      activeVersionId: "",
      versions: [],
      fieldCatalog: [],
      autoValues: {},
      values: {},
      manualValues: {},
      formulas: {},
      _hasHydrated: false,
      setMappingText: (text) =>
        set((s) => ({ mappingText: typeof text === "function" ? text(s.mappingText) : text })),
      setAliasText: (aliasText) => set({ aliasText }),
      setValidation: (v) =>
        set((s) => ({ validation: typeof v === "function" ? v(s.validation) : v })),
      setActiveVersionId: (activeVersionId) => set({ activeVersionId }),
      setVersions: (versions) => set({ versions }),
      setFieldCatalog: (catalog) =>
        set((s) => ({
          fieldCatalog: typeof catalog === "function" ? catalog(s.fieldCatalog) : catalog,
        })),
      setAutoValues: (autoValues) => set({ autoValues }),
      setValues: (values) =>
        set((s) => ({ values: typeof values === "function" ? values(s.values) : values })),
      setManualValues: (values) =>
        set((s) => ({
          manualValues: typeof values === "function" ? values(s.manualValues) : values,
        })),
      setFormulas: (formulas) =>
        set((s) => ({ formulas: typeof formulas === "function" ? formulas(s.formulas) : formulas })),
      setTemplateData: (catalog, values, manualValues) => set({ fieldCatalog: catalog, values, manualValues }),
      _setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "mapping-data-draft",
      // Persist user-entered data that would be lost on hot-reload
      partialize: (s) => ({
        manualValues: s.manualValues,
        values: s.values,
        formulas: s.formulas,
        fieldCatalog: s.fieldCatalog,
        autoValues: s.autoValues,
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    },
  ),
);

/** True after Zustand has finished reading draft from localStorage. */
export function useIsMappingDataHydrated(): boolean {
  return useMappingDataStore((s) => s._hasHydrated);
}

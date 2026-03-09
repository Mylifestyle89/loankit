import { useMemo } from "react";
import { typeLabelKey, TypeLabelMap } from "../helpers";
import { computeEffectiveValues } from "@/core/use-cases/formula-processor";
import { buildGroupedFieldTree } from "@/core/use-cases/mapping-engine";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { OcrSuggestionMap } from "../types";

export interface UseMappingComputedProps {
    t: (key: string) => string;
    mappingText: string;
    aliasText: string;
    fieldCatalog: FieldCatalogItem[];
    values: Record<string, unknown>;
    formulas: Record<string, string>;
    activeVersionId: string | null;
    versions: any[] | undefined;
    editingFieldTemplateId: string | null;
    selectedCustomerId: string | null;
    selectedFieldTemplateId: string | null;
    customGroups: string[];
    searchTerm: string;
    showUnmappedOnly: boolean;
    ocrSuggestionsByField: OcrSuggestionMap;
}

export function useMappingComputed({
    t,
    mappingText,
    aliasText,
    fieldCatalog,
    values,
    formulas,
    activeVersionId,
    versions,
    editingFieldTemplateId,
    selectedCustomerId,
    selectedFieldTemplateId,
    customGroups,
    searchTerm,
    showUnmappedOnly,
    ocrSuggestionsByField,
}: UseMappingComputedProps) {
    const aiPlaceholders = useMemo(() => {
        try {
            const parsed = JSON.parse(mappingText) as {
                mappings?: Array<{ template_field?: string }>;
            };
            return (parsed.mappings ?? [])
                .map((m) => (typeof m.template_field === "string" ? m.template_field.trim() : ""))
                .filter(Boolean);
        } catch {
            return [];
        }
    }, [mappingText]);

    const aiPlaceholderLabels = useMemo<Record<string, string>>(() => {
        const result: Record<string, string> = {};
        const placeholderSet = new Set(aiPlaceholders);

        for (const field of fieldCatalog) {
            const key = field.field_key?.trim();
            const label = field.label_vi?.trim();
            if (!key || !label) continue;
            if (placeholderSet.has(key)) result[key] = label;
        }

        try {
            const parsed = JSON.parse(aliasText) as Record<string, unknown>;
            const looksTechnical = (value: string) => /[._]/.test(value);
            for (const [k, v] of Object.entries(parsed)) {
                const key = k.trim();
                if (typeof v !== "string") continue;
                const value = v.trim();
                if (!key || !value) continue;
                if (placeholderSet.has(key) && !result[key] && !looksTechnical(value)) {
                    result[key] = value;
                    continue;
                }
                if (placeholderSet.has(value) && !result[value] && !looksTechnical(key)) {
                    result[value] = key;
                }
            }
        } catch {
            // best-effort
        }

        return result;
    }, [aiPlaceholders, aliasText, fieldCatalog]);

    const activeVersion = useMemo(
        () => versions?.find((item) => item.id === activeVersionId),
        [activeVersionId, versions],
    );

    const visibleFieldCatalog = useMemo(
        () =>
            editingFieldTemplateId || (selectedCustomerId && selectedFieldTemplateId)
                ? fieldCatalog
                : [],
        [editingFieldTemplateId, fieldCatalog, selectedCustomerId, selectedFieldTemplateId],
    );

    const hasContext = !!selectedCustomerId || !!editingFieldTemplateId;

    const groupedFieldTree = useMemo(
        () =>
            buildGroupedFieldTree({
                visibleFieldCatalog,
                customGroups,
                searchTerm,
                values,
                showUnmappedOnly,
            }),
        [customGroups, searchTerm, showUnmappedOnly, values, visibleFieldCatalog],
    );

    const parentGroups = useMemo(
        () => groupedFieldTree.map((node) => node.parent),
        [groupedFieldTree],
    );

    const effectiveValues = useMemo(
        () => computeEffectiveValues({ values, formulas, fieldCatalog }),
        [values, formulas, fieldCatalog],
    );

    const sampleByField = useMemo<Record<string, string>>(() => {
        const result: Record<string, string> = {};
        for (const field of fieldCatalog) {
            const raw = effectiveValues[field.field_key];
            if (raw === null || raw === undefined) { result[field.field_key] = ""; continue; }
            if (typeof raw === "string") { result[field.field_key] = raw.trim(); continue; }
            if (typeof raw === "number" || typeof raw === "boolean") {
                result[field.field_key] = String(raw);
                continue;
            }
            if (Array.isArray(raw)) {
                result[field.field_key] = raw.length > 0 ? `${raw.length} records` : "";
                continue;
            }
            result[field.field_key] =
                Object.keys(raw as Record<string, unknown>).length > 0 ? "Object value" : "";
        }
        return result;
    }, [effectiveValues, fieldCatalog]);

    const confidenceByField = useMemo<Record<string, number>>(() => {
        const result: Record<string, number> = {};
        for (const field of fieldCatalog) {
            const val = effectiveValues[field.field_key];
            if (val === null || val === undefined || (typeof val === "string" && val.trim() === "")) {
                result[field.field_key] = 0;
                continue;
            }
            if (field.type === "date") {
                const text = String(val).trim();
                result[field.field_key] = /(\d{2}\/\d{2}\/\d{4})|(\d{4}-\d{2}-\d{2})/.test(text) ? 100 : 70;
                continue;
            }
            if (field.type === "number" || field.type === "percent") {
                const num = Number(String(val).replace(/,/g, "."));
                result[field.field_key] = Number.isFinite(num) ? 100 : 70;
                continue;
            }
            result[field.field_key] = 100;
        }
        return result;
    }, [effectiveValues, fieldCatalog]);

    const typeLabels = useMemo<TypeLabelMap>(
        () => ({
            string: t(typeLabelKey("string")),
            number: t(typeLabelKey("number")),
            percent: t(typeLabelKey("percent")),
            date: t(typeLabelKey("date")),
            table: t(typeLabelKey("table")),
        }),
        [t],
    );

    const pendingOcrCount = useMemo(
        () => Object.values(ocrSuggestionsByField).filter((i) => i.status === "pending").length,
        [ocrSuggestionsByField],
    );

    return {
        aiPlaceholders,
        aiPlaceholderLabels,
        activeVersion,
        visibleFieldCatalog,
        hasContext,
        groupedFieldTree,
        parentGroups,
        effectiveValues,
        sampleByField,
        confidenceByField,
        typeLabels,
        pendingOcrCount,
    };
}

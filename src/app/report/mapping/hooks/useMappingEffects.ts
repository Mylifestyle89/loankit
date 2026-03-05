import { useEffect, useRef } from "react";
import { useCustomerStore } from "../stores/use-customer-store";
import { useFieldTemplateStore } from "../stores/use-field-template-store";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useOcrStore } from "../stores/use-ocr-store";
import type { ReadonlyURLSearchParams } from "next/navigation";

export interface UseMappingEffectsProps {
    loadData: () => Promise<void>;
    loadCustomers: () => Promise<void>;
    loadAllFieldTemplates: () => Promise<void>;
    loadFieldTemplates: (customerId: string) => Promise<void>;
    runAiSuggestion: () => void;
    searchParams: URLSearchParams | ReadonlyURLSearchParams;
    selectedCustomerId: string;
    editingFieldTemplateId: string | null;
    ocrLogEndRef: React.RefObject<HTMLDivElement | null>;
}

export function useMappingEffects({
    loadData,
    loadCustomers,
    loadAllFieldTemplates,
    loadFieldTemplates,
    runAiSuggestion,
    searchParams,
    selectedCustomerId,
    editingFieldTemplateId,
    ocrLogEndRef,
}: UseMappingEffectsProps) {
    const ocrLogs = useOcrStore((s) => s.ocrLogs);
    const openedAiSuggestionFromQueryRef = useRef(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { void loadData(); }, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { void loadCustomers(); void loadAllFieldTemplates(); }, []);

    useEffect(() => {
        if (editingFieldTemplateId) return;
        if (!selectedCustomerId) {
            useFieldTemplateStore.getState().setFieldTemplates([]);
            useFieldTemplateStore.getState().setSelectedFieldTemplateId("");
            useMappingDataStore.getState().setTemplateData([], {}, {});
            return;
        }
        // Clear stale data before loading to prevent flash of old customer data
        useFieldTemplateStore.getState().setSelectedFieldTemplateId("");
        useMappingDataStore.getState().setTemplateData([], {}, {});
        void loadAllFieldTemplates();
        void loadFieldTemplates(selectedCustomerId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingFieldTemplateId, selectedCustomerId]);

    useEffect(() => {
        const onOpenSuggestion = () => runAiSuggestion();
        window.addEventListener("mapping:open-ai-suggestion", onOpenSuggestion);
        return () => window.removeEventListener("mapping:open-ai-suggestion", onOpenSuggestion);
    }, [runAiSuggestion]);

    useEffect(() => {
        if (searchParams.get("openAiSuggestion") !== "1") return;
        if (openedAiSuggestionFromQueryRef.current) return;
        openedAiSuggestionFromQueryRef.current = true;
        runAiSuggestion();
    }, [runAiSuggestion, searchParams]);

    useEffect(() => {
        ocrLogEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [ocrLogs, ocrLogEndRef]);
}

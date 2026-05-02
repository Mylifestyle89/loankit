import { useEffect, useLayoutEffect, useRef } from "react";
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
    // Request-id counter to drop stale customer-template responses
    const customerLoadRequestIdRef = useRef(0);

    // Latest-ref pattern: always keep refs in sync so effects with empty deps
    // always call the current function without stale closures.
    const loadDataRef = useRef(loadData);
    const loadCustomersRef = useRef(loadCustomers);
    const loadAllFieldTemplatesRef = useRef(loadAllFieldTemplates);
    const loadFieldTemplatesRef = useRef(loadFieldTemplates);

    useLayoutEffect(() => {
        loadDataRef.current = loadData;
        loadCustomersRef.current = loadCustomers;
        loadAllFieldTemplatesRef.current = loadAllFieldTemplates;
        loadFieldTemplatesRef.current = loadFieldTemplates;
    });

    useEffect(() => { void loadDataRef.current(); }, []);

    useEffect(() => { void loadCustomersRef.current(); }, []);

    useEffect(() => {
        if (editingFieldTemplateId) return;
        if (!selectedCustomerId) {
            useFieldTemplateStore.getState().setFieldTemplates([]);
            useFieldTemplateStore.getState().setSelectedFieldTemplateId("");
            useMappingDataStore.getState().setTemplateData([], {}, {});
            return;
        }

        // Increment request-id so any stale async response can detect it's outdated
        const reqId = ++customerLoadRequestIdRef.current;

        // Clear stale data + OCR suggestions before loading new customer to prevent
        // flash of previous customer's data or OCR suggestions appearing briefly
        useFieldTemplateStore.getState().setSelectedFieldTemplateId("");
        useMappingDataStore.getState().setTemplateData([], {}, {});
        useOcrStore.getState().reset();

        void (async () => {
            await Promise.all([
                loadAllFieldTemplatesRef.current(),
                loadFieldTemplatesRef.current(selectedCustomerId),
            ]);
            // Drop result if another customer was selected while awaiting
            if (reqId !== customerLoadRequestIdRef.current) return;
        })();
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

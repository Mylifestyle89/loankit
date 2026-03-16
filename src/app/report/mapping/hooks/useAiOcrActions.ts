import { useCallback } from "react";
import { useUiStore } from "../stores/use-ui-store";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useOcrStore } from "../stores/use-ocr-store";
import { useFieldTemplateStore } from "../stores/use-field-template-store";
import { useCustomerStore } from "../stores/use-customer-store";
import { useModalStore } from "@/lib/report/use-modal-store";
import { applyAiSuggestion as applyAiSuggestionPure } from "@/core/use-cases/apply-ai-suggestion";
import type { ApplyAiSuggestionPayload } from "@/core/use-cases/apply-ai-suggestion";
import type { OcrProcessResponse, RepeaterSuggestionItem, OcrSuggestionMap, RepeaterSuggestionMap, AutoProcessJob } from "../types";

export interface UseAiOcrActionsProps {
    t: (key: string) => string;
    aiPlaceholders: string[];
    aiPlaceholderLabels: Record<string, string>;
    handleApplyBkImport: (payload: any) => Promise<void>;
    runSmartAutoBatch: (input: any) => Promise<any>;
    getAutoProcessAssets: () => Promise<any>;
    uploadAutoProcessFile: (file: File, kind: "data" | "template") => Promise<any>;
    openAutoProcessOutputFolder: (jobId: string) => Promise<void>;
}

export function useAiOcrActions({
    t,
    aiPlaceholders,
    aiPlaceholderLabels,
    handleApplyBkImport,
    runSmartAutoBatch,
    getAutoProcessAssets,
    uploadAutoProcessFile,
    openAutoProcessOutputFolder,
}: UseAiOcrActionsProps) {
    const openModal = useModalStore((s) => s.openModal);

    const applyAiSuggestion = useCallback(
        (payload: ApplyAiSuggestionPayload) => {
            const { mappingText: txt, setMappingText } = useMappingDataStore.getState();
            const { setStatus } = useUiStore.getState();
            try {
                const { nextMappingText, matched } = applyAiSuggestionPure(txt, payload);
                setMappingText(nextMappingText);
                const groupingMsg = payload.grouping
                    ? ` ${t("mapping.aiSuggest.groupingResult")
                        .replace("{groupKey}", payload.grouping.groupKey)
                        .replace("{repeatKey}", payload.grouping.repeatKey)}`
                    : "";
                setStatus({
                    message: t("mapping.aiSuggest.ok").replace("{count}", String(matched)) + groupingMsg,
                    error: "",
                });
            } catch {
                setStatus({ error: t("mapping.aiSuggest.err.failed") });
            }
        },
        [t],
    );

    const runSmartAutoBatchFlow = useCallback(
        async (input: {
            excelPath: string;
            templatePath: string;
            rootKeyOverride?: string;
            jobType?: string;
        }) => {
            const { setAutoProcessing, setAutoProcessJob } = useOcrStore.getState();
            const { setStatus } = useUiStore.getState();
            setAutoProcessing(true);
            setStatus({ error: "" });
            try {
                const finalJob = await runSmartAutoBatch({
                    excelPath: input.excelPath,
                    templatePath: input.templatePath,
                    rootKeyOverride: input.rootKeyOverride,
                    jobType: input.jobType,
                    onProgress: (job: AutoProcessJob) => setAutoProcessJob(job),
                });
                setAutoProcessJob(finalJob);
                setStatus({
                    message: t("mapping.smartAutoBatch.done").replace(
                        "{count}",
                        String(finalJob.output_paths.length),
                    ),
                });
                await openAutoProcessOutputFolder(finalJob.job_id);
            } catch (e) {
                setStatus({
                    error: e instanceof Error ? e.message : "Smart Auto-Batch thất bại.",
                });
            } finally {
                setAutoProcessing(false);
            }
        },
        [openAutoProcessOutputFolder, runSmartAutoBatch, t],
    );

    const openAutoProcessResultFolder = useCallback(async () => {
        const { autoProcessJob } = useOcrStore.getState();
        if (!autoProcessJob?.job_id) return;
        try {
            await openAutoProcessOutputFolder(autoProcessJob.job_id);
        } catch (e) {
            useUiStore
                .getState()
                .setStatus({
                    error: e instanceof Error ? e.message : "Không thể mở thư mục kết quả.",
                });
        }
    }, [openAutoProcessOutputFolder]);

    const handleApplyFinancialValues = useCallback((aiValues: Record<string, string>) => {
        const { setManualValues, setValues } = useMappingDataStore.getState();
        setManualValues((prev) => ({ ...prev, ...aiValues }));
        setValues((prev) => ({ ...prev, ...aiValues }));
    }, []);

    /** Áp dụng matched fields vào field_catalog của field template đang chọn */
    const handleApplyToFieldTemplate = useCallback(
        (newFields: import("@/lib/report/config-schema").FieldCatalogItem[]) => {
            const { fieldCatalog, setFieldCatalog } = useMappingDataStore.getState();
            const { setStatus } = useUiStore.getState();
            // Merge: chỉ thêm fields chưa tồn tại, không ghi đè
            const existingKeys = new Set(fieldCatalog.map((f) => f.field_key));
            const toAdd = newFields.filter((f) => !existingKeys.has(f.field_key));
            if (toAdd.length > 0) {
                setFieldCatalog([...fieldCatalog, ...toAdd]);
            }
            setStatus({
                message: `Đã thêm ${toAdd.length} trường vào field template (bỏ qua ${newFields.length - toAdd.length} trường đã tồn tại).`,
            });
        },
        [],
    );

    const runAiSuggestion = useCallback(() => {
        const { autoProcessJob, autoProcessing: isAuto } = useOcrStore.getState();
        const { fieldCatalog: cat } = useMappingDataStore.getState();
        openModal("aiMapping", {
            placeholders: aiPlaceholders,
            placeholderLabels: aiPlaceholderLabels,
            onApply: applyAiSuggestion,
            onSmartAutoBatch: runSmartAutoBatchFlow,
            onLoadAssetOptions: () => getAutoProcessAssets(),
            onUploadFile: (file: File, kind: "data" | "template") => uploadAutoProcessFile(file, kind),
            autoProcessJob,
            autoProcessing: isAuto,
            onOpenOutputFolder: openAutoProcessResultFolder,
            t,
            fieldCatalog: cat,
            onApplyFinancialValues: handleApplyFinancialValues,
            onApplyBkImport: handleApplyBkImport,
            onApplyToFieldTemplate: handleApplyToFieldTemplate,
        });
    }, [
        aiPlaceholders,
        aiPlaceholderLabels,
        applyAiSuggestion,
        getAutoProcessAssets,
        handleApplyBkImport,
        handleApplyFinancialValues,
        handleApplyToFieldTemplate,
        openAutoProcessResultFolder,
        openModal,
        runSmartAutoBatchFlow,
        t,
        uploadAutoProcessFile,
    ]);

    const handleOcrFileSelected = useCallback(async (file: File) => {
        const { selectedFieldTemplateId: tplId } = useFieldTemplateStore.getState();
        const {
            setOcrProcessing,
            setOcrSuggestionsByField,
            setRepeaterSuggestionsByGroup,
            setLastOcrMeta,
            pushOcrLog,
        } = useOcrStore.getState();
        const { setStatus, setModals } = useUiStore.getState();

        if (!tplId) {
            setStatus({ error: "Vui lòng chọn Mapping Instance hoặc Template trước khi OCR." });
            pushOcrLog("error", "OCR thất bại: thiếu context mapping/template.");
            return;
        }

        const fileName = (file.name ?? "").toLowerCase();
        const mimeType = (file.type ?? "").toLowerCase();
        const isDocx =
            fileName.endsWith(".docx") ||
            mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        const modeLabel = isDocx ? "DOCX Extract" : "OCR";
        const fallbackProcessUrl = isDocx
            ? "/api/report/mapping/docx-process"
            : "/api/report/mapping/ocr-process";
        const fallbackEnabled =
            String(process.env.NEXT_PUBLIC_EXTRACT_FALLBACK_ENABLED ?? "").toLowerCase() === "true" ||
            process.env.NODE_ENV === "development";

        setOcrProcessing(true);
        setStatus({ error: "" });
        pushOcrLog("system", `Bắt đầu ${modeLabel}: ${file.name}`);

        try {
            const form = new FormData();
            form.set("file", file);

            const ft = useFieldTemplateStore.getState();
            const isMappingInstance = ft.fieldTemplates.some((t) => t.id === tplId);

            if (isMappingInstance) {
                form.set("mappingInstanceId", tplId);
            } else {
                form.set("fieldTemplateId", tplId);
            }
            let res = await fetch("/api/report/mapping/extract-process", { method: "POST", body: form });
            let data = (await res.json()) as OcrProcessResponse;

            if (!res.ok || !data.ok) {
                if (fallbackEnabled) {
                    pushOcrLog(
                        "system",
                        `Unified extract lỗi, fallback sang ${isDocx ? "DOCX route" : "OCR route"}...`,
                    );
                    res = await fetch(fallbackProcessUrl, { method: "POST", body: form });
                    data = (await res.json()) as OcrProcessResponse;
                } else {
                    throw new Error(
                        data.error ?? `${modeLabel} failed on unified extract (fallback disabled).`,
                    );
                }
            }
            if (!res.ok || !data.ok) throw new Error(data.error ?? `${modeLabel} failed.`);

            const next: OcrSuggestionMap = {};
            for (const item of data.suggestions ?? []) {
                next[item.fieldKey] = {
                    fieldKey: item.fieldKey,
                    proposedValue: item.proposedValue,
                    confidenceScore: item.confidenceScore,
                    status: "pending",
                    source: item.source ?? (isDocx ? "docx_ai" : "ocr_ai"),
                };
            }
            const repeaterNext: RepeaterSuggestionMap = {};
            for (const item of data.repeaterSuggestions ?? []) {
                const typed = item as RepeaterSuggestionItem;
                if (!typed.groupPath || !Array.isArray(typed.rows) || typed.rows.length === 0) continue;
                repeaterNext[typed.groupPath] = {
                    groupPath: typed.groupPath,
                    fieldKeys: typed.fieldKeys ?? [],
                    rows: typed.rows,
                    confidenceScore: typed.confidenceScore ?? 0.6,
                    status: typed.status ?? "pending",
                    source: "docx_ai",
                };
            }

            setOcrSuggestionsByField(next);
            setRepeaterSuggestionsByGroup(repeaterNext);
            setLastOcrMeta(data.meta);
            if (Object.keys(next).length > 0 || Object.keys(repeaterNext).length > 0) {
                setModals((prev) => ({ ...prev, ocrReview: true }));
            }
            pushOcrLog(
                "ai",
                `${modeLabel} thành công, phát hiện ${Object.keys(next).length} trường dữ liệu.`,
            );
            if (Object.keys(repeaterNext).length > 0) {
                pushOcrLog(
                    "ai",
                    `${modeLabel} phát hiện ${Object.keys(repeaterNext).length} nhóm repeater.`,
                );
            }
            pushOcrLog("system", "Đã masking dữ liệu nhạy cảm trước khi AI xử lý.");
        } catch (err) {
            const msg = err instanceof Error ? err.message : `${modeLabel} failed.`;
            setStatus({ error: msg });
            pushOcrLog("error", `${modeLabel} lỗi: ${msg}`);
        } finally {
            setOcrProcessing(false);
        }
    }, []);

    return {
        applyAiSuggestion,
        runSmartAutoBatchFlow,
        openAutoProcessResultFolder,
        handleApplyFinancialValues,
        handleApplyToFieldTemplate,
        runAiSuggestion,
        handleOcrFileSelected,
    };
}

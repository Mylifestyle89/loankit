"use client";

// AiMappingModal — main shell: state, handlers, tab switching, modal frame
// Tab JSX is delegated to ai-mapping-tab-*.tsx sub-components

import { useMemo, useState, useEffect, useRef, useCallback, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";

import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { MappingSuggestResponse } from "../../types";
import type { FieldHint } from "@/services/ai-mapping.service";
import { generateFieldCatalogFromBk } from "@/lib/import/bk-importer";
import { useAutoTagging } from "../../hooks/useAutoTagging";
import { type MappingLink } from "../mapping-canvas";
import { type SystemLogEntry, type SystemLogType } from "../system-log-card";
import { FinancialAnalysisModal } from "@/components/financial-analysis/FinancialAnalysisModal";
import { type SuggestReviewItem } from "./ai-suggest-review-table";

import { type Props, type ModalSection, type BkImportResult } from "./ai-mapping-modal-types";
import { parseHeaders, getChipVariant } from "./ai-mapping-modal-utils";
import { SuggestTab } from "./ai-mapping-tab-suggest";
import { BatchTab } from "./ai-mapping-tab-batch";
import { BkImportTab } from "./ai-mapping-tab-bk-import";
import { TaggingTab } from "./ai-mapping-tab-tagging";

export function AiMappingModal({
  isOpen,
  onClose,
  placeholders,
  placeholderLabels,
  onApply,
  onSmartAutoBatch,
  onLoadAssetOptions,
  onUploadFile,
  autoProcessJob,
  autoProcessing,
  onOpenOutputFolder,
  onDownloadAllAsZip,
  t,
  fieldCatalog = [],
  onApplyFinancialValues,
  onApplyBkImport,
  onApplyToFieldTemplate,
}: Props) {
  // ── Suggest tab state ──────────────────────────────────────────────────────
  const [headersRaw, setHeadersRaw] = useState("");
  const [includeGrouping, setIncludeGrouping] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState<Record<string, string>>({});
  const [grouping, setGrouping] = useState<{ groupKey: string; repeatKey: string } | undefined>(undefined);
  const [suggestionVersion, setSuggestionVersion] = useState(0);
  const [showVietnameseAlias, setShowVietnameseAlias] = useState(true);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // DOCX extraction state (Suggest tab)
  const [docxFields, setDocxFields] = useState<string[]>([]);
  const [docxParsing, setDocxParsing] = useState(false);
  const [docxFileName, setDocxFileName] = useState("");

  // Canvas refs (Suggest tab)
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sourceScrollRef = useRef<HTMLDivElement>(null);
  const targetScrollRef = useRef<HTMLDivElement>(null);

  // ── Batch tab state ────────────────────────────────────────────────────────
  const [excelFiles, setExcelFiles] = useState<string[]>([]);
  const [templateFiles, setTemplateFiles] = useState<string[]>([]);
  const [selectedExcel, setSelectedExcel] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [manualExcelPath, setManualExcelPath] = useState("");
  const [manualTemplatePath, setManualTemplatePath] = useState("");
  const [uploadingData, setUploadingData] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [jobType, setJobType] = useState("UniversalBatch");
  const [rootKeyOverride, setRootKeyOverride] = useState("");
  const [inputMode, setInputMode] = useState<"manual" | "assets">("manual");
  const [liveLogs, setLiveLogs] = useState<SystemLogEntry[]>([]);
  const liveLogEndRef = useRef<HTMLDivElement>(null);
  const lastLogKeyRef = useRef<string>("");
  const [downloadingZip, setDownloadingZip] = useState(false);

  // ── BK Import tab state ────────────────────────────────────────────────────
  const [bkFile, setBkFile] = useState<File | null>(null);
  const [bkImporting, setBkImporting] = useState(false);
  const [bkResult, setBkResult] = useState<BkImportResult | null>(null);
  const [bkError, setBkError] = useState("");
  const [bkAccepted, setBkAccepted] = useState<Record<string, boolean>>({});
  const [bkExpandedGroups, setBkExpandedGroups] = useState<Record<string, boolean>>({});
  const [bkMode, setBkMode] = useState<"data-only" | "template-and-data">("data-only");
  const [bkTemplateName, setBkTemplateName] = useState("");

  // ── Tab navigation ─────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<ModalSection>("suggest");
  const tagging = useAutoTagging(t);

  // ── Derived values ─────────────────────────────────────────────────────────
  const handleChipHover = useCallback((key: string | null) => setHoveredKey(key), []);
  const parsedHeaders = useMemo(() => parseHeaders(headersRaw), [headersRaw]);

  const mappingLinks = useMemo<MappingLink[]>(
    () =>
      Object.entries(suggestion)
        .filter(([, header]) => Boolean(header?.trim()))
        .map(([placeholder, header]) => ({ sourceKey: header, targetKey: placeholder, isAi: true })),
    [suggestion],
  );

  const placeholderList = useMemo(
    () => [...new Set(placeholders.map((p) => p.trim()).filter(Boolean))],
    [placeholders],
  );

  const rows = useMemo(
    () =>
      placeholderList.map((placeholder) => ({
        placeholder,
        placeholderLabel: placeholderLabels?.[placeholder]?.trim() || "",
        header: suggestion[placeholder] ?? "",
      })),
    [placeholderLabels, placeholderList, suggestion],
  );

  const matchedCount = useMemo(() => rows.filter((r) => Boolean(r.header)).length, [rows]);

  const bkSelectedCount = useMemo(() => Object.values(bkAccepted).filter(Boolean).length, [bkAccepted]);
  const bkTotalCount = useMemo(
    () => (bkResult?.values ? Object.keys(bkResult.values).length : 0),
    [bkResult],
  );

  const bkGroupedValues = useMemo(() => {
    if (!bkResult?.values) return {};
    const groups: Record<string, Array<{ key: string; value: string }>> = {};
    for (const [key, value] of Object.entries(bkResult.values)) {
      const group = key.split(".").slice(0, 2).join(".");
      if (!groups[group]) groups[group] = [];
      groups[group].push({ key, value: value as string });
    }
    return groups;
  }, [bkResult]);

  // ── Log helpers ────────────────────────────────────────────────────────────
  const classifyLogType = useCallback((line: string): SystemLogType => {
    const normalized = line.toLowerCase();
    if (line.startsWith("✗") || line.startsWith("⚠") || normalized.includes("failed") || normalized.includes("lỗi"))
      return "error";
    if (normalized.includes("ai") || normalized.includes("gemini") || normalized.includes("mapping"))
      return "ai";
    return "system";
  }, []);

  const appendLog = useCallback(
    (items: SystemLogEntry[], rawLine: string, opts?: { dedupeGlobal?: boolean }) => {
      const message = rawLine.trim();
      if (!message) return items;
      if (opts?.dedupeGlobal && items.some((x) => x.message === message)) return items;
      const next = [...items.map((x) => ({ ...x, isNewest: false }))];
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        message,
        type: classifyLogType(message),
        createdAt: Date.now(),
        isNewest: true,
      });
      return next.slice(-120);
    },
    [classifyLogType],
  );

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoProcessJob) {
      if (lastLogKeyRef.current !== "") {
        lastLogKeyRef.current = "";
        setLiveLogs([]);
      }
      return;
    }
    const { phase, progress, message, output_paths, warnings, error } = autoProcessJob;
    const key = `${phase}-${progress.current}-${progress.currentLabel}-${message}`;
    if (lastLogKeyRef.current === key) return;
    lastLogKeyRef.current = key;

    setLiveLogs((prev) => {
      let next = [...prev];
      if (phase === "running" || phase === "analyzing" || phase === "ready") {
        const line = `[${progress.current}/${progress.total}] ${progress.currentLabel}`;
        if (next[next.length - 1]?.message !== line) next = appendLog(next, line);
      }
      if (message && next[next.length - 1]?.message !== `> ${message}`) {
        next = appendLog(next, `> ${message}`);
      }
      warnings.forEach((w) => { next = appendLog(next, `⚠ ${w}`, { dedupeGlobal: true }); });
      if (error) next = appendLog(next, `✗ ${error}`);
      if (phase === "completed" && output_paths.length > 0) {
        next = appendLog(next, `✓ Hoàn thành ${output_paths.length} file.`);
      }
      return next.slice(-120);
    });
  }, [appendLog, autoProcessJob]);

  useEffect(() => {
    liveLogEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveLogs]);

  // ── Suggest handlers ───────────────────────────────────────────────────────
  async function runSuggestion() {
    setError("");
    const excelHeaders = parseHeaders(headersRaw);
    if (excelHeaders.length === 0) { setError(t("mapping.aiSuggest.err.noHeaders")); return; }
    if (placeholderList.length === 0) { setError(t("mapping.aiSuggest.err.noPlaceholders")); return; }

    const fieldHints: FieldHint[] = placeholderList.flatMap((p) => {
      const item = fieldCatalog.find((f) => f.field_key === p);
      if (!item) return [];
      return [{
        key: p,
        label: item.label_vi,
        type: item.type,
        examples: item.examples?.length ? item.examples.slice(0, 3) : undefined,
        isRepeater: item.is_repeater ?? false,
      }];
    });

    setLoading(true);
    try {
      const res = await fetch("/api/report/mapping/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          excelHeaders,
          wordPlaceholders: placeholderList,
          includeGrouping,
          fieldHints: fieldHints.length > 0 ? fieldHints : undefined,
        }),
      });
      const data = (await res.json()) as MappingSuggestResponse;
      if (!data.ok || !data.suggestion) throw new Error(data.error ?? t("mapping.aiSuggest.err.failed"));
      setSuggestion(data.suggestion);
      setGrouping(data.grouping);
      setSuggestionVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.aiSuggest.err.failed"));
    } finally {
      setLoading(false);
    }
  }

  function acceptSuggestion() {
    if (onApplyToFieldTemplate && Object.keys(suggestion).length > 0) {
      setShowReview(true);
      return;
    }
    onApply({ suggestion, grouping });
    onClose();
  }

  function handleReviewConfirm(selected: SuggestReviewItem[], groupLabels: Record<string, string>) {
    const newFields: FieldCatalogItem[] = selected.map((item) => ({
      field_key: item.fieldKey,
      label_vi: item.labelVi,
      group: groupLabels[item.group] ?? item.group,
      type: item.type,
      required: false,
      examples: [],
    }));
    onApplyToFieldTemplate!(newFields);

    const filteredSuggestion: Record<string, string> = {};
    for (const item of selected) filteredSuggestion[item.fieldKey] = item.excelHeader;
    onApply({ suggestion: filteredSuggestion, grouping });
    setShowReview(false);
    onClose();
  }

  // ── DOCX extraction handler ────────────────────────────────────────────────
  const handleDocxTemplateFile = useCallback(async (file: File) => {
    setDocxFileName(file.name);
    setDocxParsing(true);
    setDocxFields([]);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/report/mapping/template-fields", { method: "POST", body: form });
      const data = (await res.json()) as { ok: boolean; placeholders?: string[]; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Lỗi trích xuất.");
      setDocxFields(data.placeholders ?? []);
    } catch {
      setDocxFields([]);
    } finally {
      setDocxParsing(false);
    }
  }, []);

  // ── Batch handlers ─────────────────────────────────────────────────────────
  async function loadAssetOptions() {
    try {
      const data = await onLoadAssetOptions();
      setExcelFiles(data.excelFiles);
      setTemplateFiles(data.templateFiles);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.smartAutoBatch.err.loadFiles"));
    }
  }

  async function startSmartAutoBatch() {
    setError("");
    const excelPath = inputMode === "manual" ? manualExcelPath : selectedExcel;
    const templatePath = inputMode === "manual" ? manualTemplatePath : selectedTemplate;
    if (!excelPath || !templatePath) { setError(t("mapping.smartAutoBatch.err.selectFiles")); return; }
    try {
      await onSmartAutoBatch({
        excelPath,
        templatePath,
        rootKeyOverride: rootKeyOverride.trim() || undefined,
        jobType: jobType.trim() || "UniversalBatch",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.smartAutoBatch.err.runFailed"));
    }
  }

  async function handleManualDataFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setUploadingData(true);
      const uploaded = await onUploadFile(file, "data");
      setManualExcelPath(uploaded);
      setSelectedExcel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("mapping.smartAutoBatch.err.runFailed"));
    } finally {
      setUploadingData(false);
    }
  }

  async function handleManualTemplateFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setUploadingTemplate(true);
      const uploaded = await onUploadFile(file, "template");
      setManualTemplatePath(uploaded);
      setSelectedTemplate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("mapping.smartAutoBatch.err.runFailed"));
    } finally {
      setUploadingTemplate(false);
    }
  }

  async function handleDownloadAllZip() {
    if (!autoProcessJob?.output_paths?.length || downloadingZip) return;
    if (onDownloadAllAsZip) {
      setDownloadingZip(true);
      try { await onDownloadAllAsZip(autoProcessJob.output_paths); }
      finally { setDownloadingZip(false); }
      return;
    }
    await onOpenOutputFolder();
  }

  // ── BK Import handlers ─────────────────────────────────────────────────────
  async function handleBkFileImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBkFile(file);
    setBkError("");
    setBkResult(null);
    setBkAccepted({});

    try {
      setBkImporting(true);
      const formData = new FormData();
      formData.append("bkFile", file);
      const response = await fetch("/api/report/import/bk", { method: "POST", body: formData });
      const result = await response.json();

      if (!response.ok || result.status === "error") {
        setBkError(result.message || "Failed to import .BK file");
        return;
      }

      setBkResult(result);
      setBkTemplateName(result.metadata?.sourceFile || file.name.replace(/\.(bk|json)$/i, ""));

      if (result.values) {
        const accepted: Record<string, boolean> = {};
        for (const key of Object.keys(result.values)) accepted[key] = true;
        setBkAccepted(accepted);
        const groups: Record<string, boolean> = {};
        for (const key of Object.keys(result.values)) {
          groups[key.split(".").slice(0, 2).join(".")] = true;
        }
        setBkExpandedGroups(groups);
      }
    } catch (err) {
      setBkError(err instanceof Error ? err.message : "Failed to import .BK file");
    } finally {
      setBkImporting(false);
    }
  }

  function handleBkApplySelected() {
    if (!bkResult?.values || !onApplyBkImport) return;
    const selected: Record<string, string> = {};
    for (const [key, value] of Object.entries(bkResult.values)) {
      if (bkAccepted[key]) selected[key] = value as string;
    }
    if (Object.keys(selected).length === 0) return;

    if (bkMode === "template-and-data") {
      const newFields = generateFieldCatalogFromBk(selected);
      const templateName = bkTemplateName.trim() || bkResult.metadata?.sourceFile || "BK Import";
      onApplyBkImport({ mode: "template-and-data", values: selected, newFields, templateName });
    } else {
      onApplyBkImport({ mode: "data-only", values: selected });
    }
    onClose();
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal panel */}
          <motion.div
            className="relative flex max-h-[92vh] w-full max-w-[95vw] md:max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200/50 bg-white/70 shadow-xl backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#141414]/90"
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200/50 px-4 py-3 dark:border-white/[0.07]">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                <Sparkles className="h-4 w-4 text-violet-500" />
                {t("mapping.aiSuggest.modalTitle")}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100/80 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-200"
                aria-label={t("mapping.changeGroup.cancel")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-slate-200/50 px-4 dark:border-white/[0.07]">
              {(["bk", "suggest", "tagging", "financial", "batch"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveSection(tab)}
                  className={`relative px-3 py-2.5 text-xs font-medium transition-colors ${
                    activeSection === tab
                      ? "text-violet-700 dark:text-violet-400"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {t(`mapping.tabs.${tab}`)}
                  {activeSection === tab && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-violet-600"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex min-h-0 max-h-[72vh] flex-1 flex-col overflow-y-auto">
              {activeSection === "suggest" && (
                <SuggestTab
                  canvasContainerRef={canvasContainerRef}
                  sourceScrollRef={sourceScrollRef}
                  targetScrollRef={targetScrollRef}
                  headersRaw={headersRaw}
                  setHeadersRaw={setHeadersRaw}
                  parsedHeaders={parsedHeaders}
                  includeGrouping={includeGrouping}
                  setIncludeGrouping={setIncludeGrouping}
                  loading={loading}
                  error={error}
                  suggestion={suggestion}
                  grouping={grouping}
                  suggestionVersion={suggestionVersion}
                  mappingLinks={mappingLinks}
                  placeholderList={placeholderList}
                  rows={rows}
                  matchedCount={matchedCount}
                  showVietnameseAlias={showVietnameseAlias}
                  setShowVietnameseAlias={setShowVietnameseAlias}
                  hoveredKey={hoveredKey}
                  setHoveredKey={setHoveredKey}
                  handleChipHover={handleChipHover}
                  docxParsing={docxParsing}
                  docxFileName={docxFileName}
                  docxFields={docxFields}
                  handleDocxTemplateFile={handleDocxTemplateFile}
                  showReview={showReview}
                  setShowReview={setShowReview}
                  fieldCatalog={fieldCatalog}
                  handleReviewConfirm={handleReviewConfirm}
                  runSuggestion={runSuggestion}
                  acceptSuggestion={acceptSuggestion}
                  onClose={onClose}
                  t={t}
                />
              )}

              {activeSection === "batch" && (
                <BatchTab
                  inputMode={inputMode}
                  setInputMode={setInputMode}
                  excelFiles={excelFiles}
                  templateFiles={templateFiles}
                  selectedExcel={selectedExcel}
                  setSelectedExcel={setSelectedExcel}
                  selectedTemplate={selectedTemplate}
                  setSelectedTemplate={setSelectedTemplate}
                  manualExcelPath={manualExcelPath}
                  manualTemplatePath={manualTemplatePath}
                  handleManualDataFile={handleManualDataFile}
                  handleManualTemplateFile={handleManualTemplateFile}
                  uploadingData={uploadingData}
                  uploadingTemplate={uploadingTemplate}
                  jobType={jobType}
                  setJobType={setJobType}
                  rootKeyOverride={rootKeyOverride}
                  setRootKeyOverride={setRootKeyOverride}
                  autoProcessJob={autoProcessJob}
                  autoProcessing={autoProcessing}
                  liveLogs={liveLogs}
                  liveLogEndRef={liveLogEndRef}
                  downloadingZip={downloadingZip}
                  handleDownloadAllZip={handleDownloadAllZip}
                  loadAssetOptions={loadAssetOptions}
                  startSmartAutoBatch={startSmartAutoBatch}
                  onOpenOutputFolder={onOpenOutputFolder}
                  error={error}
                  t={t}
                />
              )}

              {activeSection === "bk" && (
                <BkImportTab
                  bkFile={bkFile}
                  bkImporting={bkImporting}
                  bkResult={bkResult}
                  bkError={bkError}
                  bkAccepted={bkAccepted}
                  setBkAccepted={setBkAccepted}
                  bkExpandedGroups={bkExpandedGroups}
                  setBkExpandedGroups={setBkExpandedGroups}
                  bkMode={bkMode}
                  setBkMode={setBkMode}
                  bkTemplateName={bkTemplateName}
                  setBkTemplateName={setBkTemplateName}
                  bkSelectedCount={bkSelectedCount}
                  bkTotalCount={bkTotalCount}
                  bkGroupedValues={bkGroupedValues}
                  handleBkFileImport={handleBkFileImport}
                  handleBkApplySelected={handleBkApplySelected}
                  onApplyBkImport={onApplyBkImport}
                />
              )}

              {activeSection === "tagging" && (
                <TaggingTab
                  headersRaw={headersRaw}
                  setHeadersRaw={setHeadersRaw}
                  tagging={tagging}
                  t={t}
                />
              )}

              {activeSection === "financial" && (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
                  <FinancialAnalysisModal
                    isOpen={true}
                    onClose={() => setActiveSection("suggest")}
                    fieldCatalog={fieldCatalog}
                    onApplyValues={onApplyFinancialValues ?? (() => {})}
                    embedded
                  />
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

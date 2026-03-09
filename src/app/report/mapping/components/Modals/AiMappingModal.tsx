"use client";

import { useMemo, useState, useEffect, useRef, useCallback, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Sparkles, X, FileText, Download, Check, HelpCircle, KeyRound, Tags, ArrowRight, Upload, Database, AlertCircle, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { translateFieldLabelVi } from "@/lib/report/field-labels";
import { generateFieldCatalogFromBk } from "@/lib/import/bk-importer";

import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { AutoProcessJob, MappingSuggestResponse } from "../../types";
import type { FieldHint } from "@/services/ai-mapping.service";
import { suggestAliasForPlaceholder } from "@/lib/report/placeholder-utils";
import { MappingCanvas, type MappingLink } from "../MappingCanvas";
import { useAutoTagging } from "../../hooks/useAutoTagging";
import { getSignedFileUrl } from "@/lib/report/signed-file-url";
import { SystemLogCard, type SystemLogEntry, type SystemLogType } from "../SystemLogCard";
import { FinancialAnalysisModal } from "./FinancialAnalysisModal";

type ModalSection = "suggest" | "batch" | "tagging" | "financial" | "bk";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  placeholders: string[];
  placeholderLabels?: Record<string, string>;
  onApply: (payload: { suggestion: Record<string, string>; grouping?: { groupKey: string; repeatKey: string } }) => void;
  onSmartAutoBatch: (input: { excelPath: string; templatePath: string; rootKeyOverride?: string; jobType?: string }) => Promise<void>;
  onLoadAssetOptions: () => Promise<{ excelFiles: string[]; templateFiles: string[] }>;
  onUploadFile: (file: File, kind: "data" | "template") => Promise<string>;
  autoProcessJob: AutoProcessJob | null;
  autoProcessing: boolean;
  onOpenOutputFolder: () => Promise<void>;
  onDownloadAllAsZip?: (paths: string[]) => Promise<void>;
  t: (key: string) => string;
  /** Cho tab Phân tích tài chính (nhúng trong modal AI). */
  fieldCatalog?: FieldCatalogItem[];
  onApplyFinancialValues?: (values: Record<string, string>) => void;
  /** Cho tab BK Import — hỗ trợ 2 mode: data-only / template-and-data. */
  onApplyBkImport?: (payload: {
    mode: "data-only" | "template-and-data";
    values: Record<string, string>;
    newFields?: FieldCatalogItem[];
    templateName?: string;
  }) => void;
};

function parseHeaders(raw: string): string[] {
  return [...new Set(raw.split(/[\n,]+/g).map((s) => s.trim()).filter(Boolean))];
}

type ChipVariant = "single" | "repeater" | "root";

function getChipVariant(
  placeholder: string,
  grouping: { groupKey: string; repeatKey: string } | undefined
): ChipVariant {
  if (!grouping) return "single";
  const p = placeholder.trim();
  if (p === grouping.groupKey) return "root";
  if (p === grouping.repeatKey || p.includes(grouping.repeatKey)) return "repeater";
  return "single";
}

const chipStyles: Record<
  ChipVariant,
  { border: string; text: string; bg: string; icon: string }
> = {
  single: {
    border: "border-violet-200/80 dark:border-violet-500/30",
    text: "text-violet-800 dark:text-violet-400",
    bg: "bg-violet-50/60 dark:bg-violet-500/10",
    icon: "text-violet-600 dark:text-violet-400",
  },
  repeater: {
    border: "border-violet-200/80",
    text: "text-violet-800",
    bg: "bg-violet-50/60",
    icon: "text-violet-600",
  },
  root: {
    border: "border-amber-200/80",
    text: "text-amber-800",
    bg: "bg-amber-50/60",
    icon: "text-amber-600",
  },
};

function MappingChip({
  placeholder,
  placeholderLabel,
  mappedHeader,
  variant,
  index,
  staggerDelay = 0,
  onHover,
}: {
  placeholder: string;
  placeholderLabel?: string;
  mappedHeader: string;
  variant: ChipVariant;
  index: number;
  staggerDelay?: number;
  onHover?: (key: string | null) => void;
}) {
  const isMapped = Boolean(mappedHeader?.trim());
  const style = chipStyles[variant];

  return (
    <motion.div
      data-placeholder={placeholder}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
        delay: index * staggerDelay,
      }}
      className={`relative flex items-center justify-between gap-2 rounded-xl border ${style.border} ${style.bg} px-3 py-2 pr-9 shadow-sm transition-shadow hover:shadow-md`}
      onMouseEnter={() => onHover?.(placeholder)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {variant === "root" && (
          <KeyRound className={`h-4 w-4 flex-shrink-0 ${style.icon}`} aria-hidden />
        )}
        <span className={`truncate text-sm font-medium ${style.text}`} title={placeholderLabel || placeholder}>
          {placeholderLabel || placeholder}
        </span>
      </div>
      <span className={`min-w-0 truncate text-right text-xs ${style.text} opacity-80`} title={mappedHeader || "—"}>
        {mappedHeader || "—"}
      </span>
      <span
        className={`absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 flex-shrink-0 items-center justify-center rounded-full ${
          isMapped ? "bg-emerald-500/20 text-emerald-600" : "bg-slate-200/60 text-slate-400 dark:bg-white/[0.08] dark:text-slate-500"
        }`}
        aria-label={isMapped ? "Đã map" : "Chưa map"}
      >
        {isMapped ? <Check className="h-3 w-3" /> : <HelpCircle className="h-3 w-3" />}
      </span>
    </motion.div>
  );
}

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
}: Props) {
  const [headersRaw, setHeadersRaw] = useState("");
  const [includeGrouping, setIncludeGrouping] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState<Record<string, string>>({});
  const [grouping, setGrouping] = useState<{ groupKey: string; repeatKey: string } | undefined>(undefined);
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
  const [suggestionVersion, setSuggestionVersion] = useState(0);
  const [showVietnameseAlias, setShowVietnameseAlias] = useState(true);

  const [docxFields, setDocxFields] = useState<string[]>([]);
  const [docxParsing, setDocxParsing] = useState(false);
  const [docxFileName, setDocxFileName] = useState("");

  const [activeSection, setActiveSection] = useState<ModalSection>("suggest");
  const tagging = useAutoTagging(t);

  // .BK Import states
  const [bkFile, setBkFile] = useState<File | null>(null);
  const [bkImporting, setBkImporting] = useState(false);
  const [bkResult, setBkResult] = useState<any | null>(null);
  const [bkError, setBkError] = useState("");
  const [bkAccepted, setBkAccepted] = useState<Record<string, boolean>>({});
  const [bkExpandedGroups, setBkExpandedGroups] = useState<Record<string, boolean>>({});
  const [bkMode, setBkMode] = useState<"data-only" | "template-and-data">("data-only");
  const [bkTemplateName, setBkTemplateName] = useState("");

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sourceScrollRef = useRef<HTMLDivElement>(null);
  const targetScrollRef = useRef<HTMLDivElement>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const handleChipHover = useCallback((key: string | null) => setHoveredKey(key), []);

  const parsedHeaders = useMemo(() => parseHeaders(headersRaw), [headersRaw]);

  const mappingLinks = useMemo<MappingLink[]>(() => {
    return Object.entries(suggestion)
      .filter(([, header]) => Boolean(header?.trim()))
      .map(([placeholder, header]) => ({
        sourceKey: header,
        targetKey: placeholder,
        isAi: true,
      }));
  }, [suggestion]);

  const classifyLogType = useCallback((line: string): SystemLogType => {
    const normalized = line.toLowerCase();
    if (line.startsWith("✗") || line.startsWith("⚠") || normalized.includes("failed") || normalized.includes("lỗi")) {
      return "error";
    }
    if (normalized.includes("ai") || normalized.includes("gemini") || normalized.includes("mapping")) {
      return "ai";
    }
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

  useEffect(() => {
    if (!autoProcessJob) {
      const prev = lastLogKeyRef.current;
      if (prev !== "") {
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
      warnings.forEach((w) => {
        next = appendLog(next, `⚠ ${w}`, { dedupeGlobal: true });
      });
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

  const placeholderList = useMemo(() => [...new Set(placeholders.map((p) => p.trim()).filter(Boolean))], [placeholders]);
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

  async function loadAssetOptions() {
    try {
      const data = await onLoadAssetOptions();
      setExcelFiles(data.excelFiles);
      setTemplateFiles(data.templateFiles);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.smartAutoBatch.err.loadFiles"));
    }
  }

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

  async function runSuggestion() {
    setError("");
    const excelHeaders = parseHeaders(headersRaw);
    if (excelHeaders.length === 0) {
      setError(t("mapping.aiSuggest.err.noHeaders"));
      return;
    }
    if (placeholderList.length === 0) {
      setError(t("mapping.aiSuggest.err.noPlaceholders"));
      return;
    }

    // Build fieldHints từ fieldCatalog để AI hiểu label/type của từng placeholder
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
      if (!data.ok || !data.suggestion) {
        throw new Error(data.error ?? t("mapping.aiSuggest.err.failed"));
      }
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
    onApply({ suggestion, grouping });
    onClose();
  }

  async function startSmartAutoBatch() {
    setError("");
    const excelPath = inputMode === "manual" ? manualExcelPath : selectedExcel;
    const templatePath = inputMode === "manual" ? manualTemplatePath : selectedTemplate;
    if (!excelPath || !templatePath) {
      setError(t("mapping.smartAutoBatch.err.selectFiles"));
      return;
    }
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

  async function handleDownloadAllZip() {
    if (!autoProcessJob?.output_paths?.length || downloadingZip) return;
    if (onDownloadAllAsZip) {
      setDownloadingZip(true);
      try {
        await onDownloadAllAsZip(autoProcessJob.output_paths);
      } finally {
        setDownloadingZip(false);
      }
      return;
    }
    await onOpenOutputFolder();
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

      const response = await fetch("/api/report/import/bk", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || result.status === "error") {
        setBkError(result.message || "Failed to import .BK file");
        return;
      }

      setBkResult(result);

      // Default template name from source file or file name
      setBkTemplateName(result.metadata?.sourceFile || file.name.replace(/\.(bk|json)$/i, ""));

      // Default: select all imported values
      if (result.values) {
        const accepted: Record<string, boolean> = {};
        for (const key of Object.keys(result.values)) {
          accepted[key] = true;
        }
        setBkAccepted(accepted);
        // Expand all groups by default
        const groups: Record<string, boolean> = {};
        for (const key of Object.keys(result.values)) {
          const group = key.split(".").slice(0, 2).join(".");
          groups[group] = true;
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
      if (bkAccepted[key]) {
        selected[key] = value as string;
      }
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

  const bkSelectedCount = useMemo(() => Object.values(bkAccepted).filter(Boolean).length, [bkAccepted]);
  const bkTotalCount = useMemo(() => (bkResult?.values ? Object.keys(bkResult.values).length : 0), [bkResult]);

  // Group BK results by category (A.general, A.credit, etc.)
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
          {/* Backdrop with blur */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal panel – slide up + glassmorphism */}
          <motion.div
            className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200/50 bg-white/70 shadow-xl backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#141414]/90"
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
          >
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

            {/* Outer content wrapper */}
            <div className="flex min-h-0 max-h-[72vh] flex-1 flex-col overflow-y-auto">

            {activeSection === "suggest" && (
              <>
              {/* Two-panel mapping area with Bezier overlay */}
              <div ref={canvasContainerRef} className="relative flex-shrink-0 p-4">
                {/* SVG Bezier Canvas Overlay */}
                <MappingCanvas
                  links={mappingLinks}
                  containerRef={canvasContainerRef}
                  sourceScrollRef={sourceScrollRef}
                  targetScrollRef={targetScrollRef}
                  animationKey={suggestionVersion}
                  hoveredKey={hoveredKey}
                />

                <div className="grid gap-4 md:grid-cols-2 md:min-h-[280px]">
                  {/* Panel: Source (Excel) */}
                  <motion.div
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                    className="panel-flex-safe flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/50 bg-white/40 shadow-sm backdrop-blur-md dark:border-white/[0.07] dark:bg-white/[0.04]"
                  >
                    <div className="border-b border-slate-200/50 px-4 py-2.5 dark:border-white/[0.07]">
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Source (Excel)</h4>
                    </div>
                    <div ref={sourceScrollRef} className="min-h-0 flex-1 overflow-y-auto p-4">
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">{t("mapping.aiSuggest.headersLabel")}</label>
                        <textarea
                          value={headersRaw}
                          onChange={(e) => setHeadersRaw(e.target.value)}
                          rows={5}
                          placeholder={t("mapping.aiSuggest.headersPlaceholder")}
                          className="w-full rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-100 dark:placeholder:text-slate-500"
                        />
                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={includeGrouping}
                            onChange={(e) => setIncludeGrouping(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                          />
                          {t("mapping.aiSuggest.includeGrouping")}
                        </label>
                        <button
                          type="button"
                          onClick={() => void runSuggestion()}
                          disabled={loading}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:brightness-110 disabled:opacity-70"
                        >
                          <Bot className="h-4 w-4" />
                          {loading ? t("mapping.aiSuggest.loading") : t("mapping.aiSuggest.runGemini")}
                        </button>
                        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                      </div>

                      {/* DOCX Template field extraction */}
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Trích xuất từ Template DOCX
                          </span>
                          <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-violet-300 hover:text-violet-600 dark:hover:border-violet-500/40 dark:hover:text-violet-400 transition-colors">
                            <FileText className="h-3 w-3 flex-shrink-0" />
                            {docxParsing ? "Đang đọc..." : docxFileName ? docxFileName.replace(/\.docx$/i, "").slice(0, 20) : "Chọn .docx"}
                            <input
                              type="file"
                              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = "";
                                if (f) void handleDocxTemplateFile(f);
                              }}
                            />
                          </label>
                        </div>
                        {docxFields.length > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                {docxFields.length} field tìm thấy
                              </span>
                              <button
                                type="button"
                                onClick={() => setHeadersRaw(docxFields.join("\n"))}
                                className="flex items-center gap-1 rounded border border-violet-300 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
                              >
                                <ArrowRight className="h-3 w-3" />
                                Dùng làm Headers
                              </button>
                            </div>
                            <div className="flex flex-col gap-1">
                              {docxFields.map((field) => {
                                const matches = suggestAliasForPlaceholder(field, parsedHeaders);
                                const hasMatch = matches.length > 0;
                                return (
                                  <div key={field} className="space-y-0.5">
                                    <div
                                      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${
                                        hasMatch
                                          ? "border-violet-400/70 dark:border-violet-400/30 bg-violet-100/60 dark:bg-violet-500/20 text-violet-800 dark:text-violet-300"
                                          : "border-violet-200/70 dark:border-violet-500/20 bg-violet-50/50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400"
                                      }`}
                                    >
                                      <span className="text-violet-500 dark:text-violet-400 select-none">[</span>
                                      <span className="min-w-0 truncate font-sans" title={field}>
                                        {field}
                                      </span>
                                      <span className="text-violet-500 dark:text-violet-400 select-none">]</span>
                                    </div>
                                    {hasMatch && (
                                      <div className="pl-2 text-[10px] text-slate-500 dark:text-slate-400">
                                        → {matches.join(", ")}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Parsed Excel header chips */}
                      {parsedHeaders.length > 0 && (
                        <div className="mt-4 space-y-1.5">
                          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                            Headers ({parsedHeaders.length})
                          </span>
                          <div className="flex flex-col gap-1.5">
                            {parsedHeaders.map((header) => {
                              const isMapped = Object.values(suggestion).includes(header);
                              return (
                                <div
                                  key={header}
                                  data-header={header}
                                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-shadow ${
                                    isMapped
                                      ? "border-violet-200/80 bg-violet-50/60 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400"
                                      : "border-slate-200/80 bg-slate-50/60 text-slate-600 dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-slate-300"
                                  } ${hoveredKey === header ? "shadow-md ring-1 ring-violet-300/60" : ""}`}
                                  onMouseEnter={() => setHoveredKey(header)}
                                  onMouseLeave={() => setHoveredKey(null)}
                                >
                                  <span className="min-w-0 truncate" title={header}>{header}</span>
                                  {isMapped && (
                                    <Check className="h-3 w-3 flex-shrink-0 text-emerald-500" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Panel: Target (Template) */}
                  <motion.div
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                    className="panel-flex-safe flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/50 bg-white/40 shadow-sm backdrop-blur-md dark:border-white/[0.07] dark:bg-white/[0.04]"
                  >
                    <div className="border-b border-slate-200/50 px-4 py-2.5 dark:border-white/[0.07]">
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Target (Template)</h4>
                    </div>
                    <div ref={targetScrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {t("mapping.aiSuggest.placeholderCount").replace("{count}", String(placeholderList.length))}
                          </p>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {t("mapping.aiSuggest.matchedCount").replace("{count}", String(matchedCount))}
                          </p>
                        </div>
                        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={showVietnameseAlias}
                            onChange={(e) => setShowVietnameseAlias(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                          />
                          Alias Việt
                        </label>
                      </div>
                      {placeholderList.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t("mapping.aiSuggest.err.noPlaceholders")}</p>
                      ) : (
                        <div className="space-y-2" key={`mapping-chips-${suggestionVersion}`}>
                          {rows.map((row, idx) => (
                            <MappingChip
                              key={row.placeholder}
                              placeholder={row.placeholder}
                              placeholderLabel={showVietnameseAlias ? row.placeholderLabel : row.placeholder}
                              mappedHeader={row.header}
                              variant={getChipVariant(row.placeholder, grouping)}
                              index={idx}
                              staggerDelay={0.04}
                              onHover={handleChipHover}
                            />
                          ))}
                        </div>
                      )}
                      {grouping ? (
                        <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-xs font-medium text-amber-800">
                          {t("mapping.aiSuggest.groupingResult")
                            .replace("{groupKey}", grouping.groupKey)
                            .replace("{repeatKey}", grouping.repeatKey)}
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                </div>
              </div>
              </>
            )}

            {activeSection === "batch" && (
              <div className="border-t border-white/40 px-4 py-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-violet-900 dark:text-violet-400">{t("mapping.smartAutoBatch.sectionTitle")}</h4>
                  <div className="inline-flex rounded-md border border-violet-200/60 bg-white/50 p-0.5 text-xs dark:border-violet-500/30 dark:bg-white/[0.04]">
                    <button
                      type="button"
                      onClick={() => setInputMode("manual")}
                      className={`rounded px-2 py-1 transition-colors ${inputMode === "manual" ? "bg-violet-700 text-white" : "text-zinc-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/[0.06]"}`}
                    >
                      {t("mapping.smartAutoBatch.modeManual")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode("assets")}
                      className={`rounded px-2 py-1 transition-colors ${inputMode === "assets" ? "bg-violet-700 text-white" : "text-zinc-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/[0.06]"}`}
                    >
                      {t("mapping.smartAutoBatch.modeAssets")}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <span className="block text-xs font-medium text-zinc-700 dark:text-slate-200">{t("mapping.smartAutoBatch.excelLabel")}</span>
                    <div className="rounded-lg border-2 border-violet-300 bg-white/70 px-3 py-2 shadow-sm transition-colors focus-within:border-violet-500 focus-within:ring-2 focus:ring-violet-200 dark:border-violet-500/30 dark:bg-white/[0.04]">
                      {inputMode === "manual" ? (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs text-violet-600 dark:text-violet-400">{t("mapping.smartAutoBatch.chooseFile")}</span>
                          <input
                            type="file"
                            accept=".csv,.xlsx,.xls,.json,.md"
                            onChange={(e) => void handleManualDataFile(e)}
                            className="block w-full text-xs file:mr-2 file:rounded-md file:border-2 file:border-violet-400 file:bg-violet-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700 file:hover:bg-violet-100"
                          />
                          {!manualExcelPath ? (
                            <span className="text-[11px] text-zinc-500 dark:text-slate-400">{t("mapping.smartAutoBatch.noFileChosen")}</span>
                          ) : null}
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void loadAssetOptions()}
                            className="rounded-md border-2 border-violet-300 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-violet-500 hover:bg-violet-50 dark:border-violet-500/30 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-violet-500/10"
                          >
                            {t("mapping.smartAutoBatch.loadFiles")}
                          </button>
                          <select
                            value={selectedExcel}
                            onChange={(e) => setSelectedExcel(e.target.value)}
                            className="mt-2 w-full rounded-lg border-2 border-violet-300 bg-white px-2 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-violet-500/30 dark:bg-[#141414]/90 dark:text-slate-100"
                            disabled={inputMode !== "assets"}
                          >
                            <option value="">{t("mapping.smartAutoBatch.selectExcel")}</option>
                            {excelFiles.map((file) => (
                              <option key={file} value={file}>
                                {file}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                    {manualExcelPath ? <p className="break-all text-[11px] text-emerald-700">{manualExcelPath}</p> : null}
                  </div>

                  <div className="space-y-1.5">
                    <span className="block text-xs font-medium text-zinc-700 dark:text-slate-200">{t("mapping.smartAutoBatch.templateLabel")}</span>
                    <div className="rounded-lg border-2 border-violet-300 bg-white/70 px-3 py-2 shadow-sm transition-colors focus-within:border-violet-500 focus-within:ring-2 focus:ring-violet-200 dark:border-violet-500/30 dark:bg-white/[0.04]">
                      {inputMode === "manual" ? (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs text-violet-600 dark:text-violet-400">{t("mapping.smartAutoBatch.chooseFile")}</span>
                          <input
                            type="file"
                            accept=".docx,.doc"
                            onChange={(e) => void handleManualTemplateFile(e)}
                            className="block w-full text-xs file:mr-2 file:rounded-md file:border-2 file:border-violet-400 file:bg-violet-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700 file:hover:bg-violet-100"
                          />
                          {!manualTemplatePath ? (
                            <span className="text-[11px] text-zinc-500 dark:text-slate-400">{t("mapping.smartAutoBatch.noFileChosen")}</span>
                          ) : null}
                        </div>
                      ) : (
                        <select
                          value={selectedTemplate}
                          onChange={(e) => setSelectedTemplate(e.target.value)}
                          className="w-full rounded-lg border-2 border-violet-300 bg-white px-2 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-violet-500/30 dark:bg-[#141414]/90 dark:text-slate-100"
                          disabled={inputMode !== "assets"}
                        >
                          <option value="">{t("mapping.smartAutoBatch.selectTemplate")}</option>
                          {templateFiles.map((file) => (
                            <option key={file} value={file}>
                              {file}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    {manualTemplatePath ? <p className="break-all text-[11px] text-emerald-700">{manualTemplatePath}</p> : null}
                  </div>

                  <label className="text-xs text-zinc-700 dark:text-slate-200">
                    {t("mapping.smartAutoBatch.jobTypeLabel")}
                    <input
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value)}
                      className="mt-1 w-full rounded-md border border-violet-200/60 bg-white/50 px-2 py-1.5 text-sm dark:border-violet-500/30 dark:bg-white/[0.04] dark:text-slate-100"
                    />
                  </label>

                  <label className="text-xs text-zinc-700 dark:text-slate-200">
                    {t("mapping.smartAutoBatch.rootKeyLabel")}
                    <input
                      value={rootKeyOverride}
                      onChange={(e) => setRootKeyOverride(e.target.value)}
                      placeholder={autoProcessJob?.suggested_root_key || t("mapping.smartAutoBatch.autoDetectPlaceholder")}
                      className="mt-1 w-full rounded-md border border-violet-200/60 bg-white/50 px-2 py-1.5 text-sm dark:border-violet-500/30 dark:bg-white/[0.04] dark:text-slate-100"
                    />
                  </label>
                </div>

                {autoProcessJob ? (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-lg border border-zinc-200/80 bg-zinc-900/95 p-3 text-zinc-300 dark:border-white/[0.08]">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-semibold text-violet-400">
                          {t("mapping.smartAutoBatch.rootKeyDetected")}: {autoProcessJob.suggested_root_key || "—"}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {autoProcessJob.progress.current}/{autoProcessJob.progress.total}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded bg-zinc-800">
                        <div
                          className="h-full bg-violet-500 transition-all duration-300"
                          style={{ width: `${Math.max(0, Math.min(100, autoProcessJob.progress.percent))}%` }}
                        />
                      </div>
                    </div>

                    <SystemLogCard logs={liveLogs} endRef={liveLogEndRef} title="System Timeline" />

                    {/* Bento Grid – File Cards (Modern Premium 2025) */}
                    {autoProcessJob.phase === "completed" && autoProcessJob.output_paths.length > 0 ? (
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-white/[0.09] dark:bg-white/[0.04]">
                        <h5 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                          File đã xuất ({autoProcessJob.output_paths.length})
                        </h5>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                          {autoProcessJob.output_paths.map((filePath, idx) => {
                            const basename = filePath.split(/[/\\]/).pop() ?? filePath;
                            return (
                              <motion.a
                                key={idx}
                                href="#"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  try {
                                    const url = await getSignedFileUrl(filePath, true);
                                    window.open(url, "_blank", "noopener,noreferrer");
                                  } catch { /* noop */ }
                                }}
                                rel="noopener noreferrer"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 360,
                                  damping: 28,
                                  delay: idx * 0.04,
                                }}
                                className="group flex flex-col rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm transition-all hover:border-violet-300 hover:shadow-md hover:shadow-violet-500/10 dark:border-white/[0.07] dark:bg-white/[0.04] dark:hover:border-violet-500/30"
                              >
                                <div className="mb-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 group-hover:bg-violet-200/80 dark:bg-violet-500/10 dark:text-violet-400">
                                  <FileText className="h-5 w-5" aria-hidden />
                                </div>
                                <span
                                  className="min-w-0 truncate text-xs font-medium text-slate-800 dark:text-slate-200"
                                  title={filePath}
                                >
                                  {basename}
                                </span>
                                <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                  <span>Docx</span>
                                  <span aria-hidden>•</span>
                                  <span>— KB</span>
                                </span>
                              </motion.a>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void startSmartAutoBatch()}
                    disabled={autoProcessing || uploadingData || uploadingTemplate}
                    className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-sm text-white shadow-sm shadow-violet-500/25 transition-colors hover:brightness-110 disabled:opacity-60"
                  >
                    {autoProcessing ? t("mapping.smartAutoBatch.running") : t("mapping.smartAutoBatch.start")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onOpenOutputFolder()}
                    disabled={!autoProcessJob || autoProcessJob.phase !== "completed"}
                    className="rounded-lg border border-zinc-300 bg-white/80 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-violet-50 hover:border-violet-300 disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-violet-500/10 dark:hover:border-violet-500/30"
                  >
                    {t("mapping.smartAutoBatch.openOutput")}
                  </button>
                </div>
              </div>
            )}

            {/* ===== .BK Import Tab ===== */}
            {activeSection === "bk" && (
              <div className="space-y-4 px-4 py-4">
                {/* Header info */}
                <div className="rounded-xl border border-blue-200/60 bg-gradient-to-br from-blue-50/80 via-blue-50/40 to-violet-50/40 p-3 dark:border-blue-500/25 dark:from-blue-500/10 dark:via-blue-500/5 dark:to-violet-500/5">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">Import dữ liệu .BK</h3>
                      <p className="text-xs text-blue-700/70 dark:text-blue-300/60">
                        Hệ thống Agribank (APC) &mdash; Tự động match với các field hiện tại
                      </p>
                    </div>
                    {/* Upload button inline */}
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-300 bg-white/80 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-50 hover:border-blue-400 hover:shadow dark:border-blue-500/40 dark:bg-white/[0.06] dark:text-blue-300 dark:hover:bg-blue-500/10">
                      <Upload className="h-3.5 w-3.5" />
                      {bkFile ? "Chọn lại" : "Chọn file .BK"}
                      <input
                        type="file"
                        accept=".bk,.json"
                        className="hidden"
                        onChange={handleBkFileImport}
                        disabled={bkImporting}
                      />
                    </label>
                  </div>
                </div>

                {/* Loading */}
                {bkImporting && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 rounded-lg bg-blue-50/60 px-3 py-4 dark:bg-blue-500/10">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600 dark:border-blue-500/30 dark:border-t-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Đang phân tích file...</span>
                  </motion.div>
                )}

                {/* Error */}
                {bkError && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2 rounded-lg bg-red-50/60 px-3 py-2.5 dark:bg-red-500/10">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">{bkError}</span>
                  </motion.div>
                )}

                {/* Empty state */}
                {!bkFile && !bkResult && !bkImporting && (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-blue-200/60 bg-white/50 px-4 py-10 dark:border-blue-500/20 dark:bg-white/[0.02]">
                    <Database className="h-10 w-10 text-blue-300 dark:text-blue-500/50" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Chưa có file nào được chọn</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Upload file .bk hoặc .json từ hệ thống Agribank (APC)
                      </p>
                    </div>
                  </div>
                )}

                {/* ===== REVIEW TABLE ===== */}
                {bkResult && !bkError && Object.keys(bkGroupedValues).length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    {/* Summary bar */}
                    <div className="flex items-center justify-between rounded-lg bg-slate-50/80 px-3 py-2 dark:bg-white/[0.04]">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {bkResult.metadata?.sourceFile}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          &mdash; {bkSelectedCount}/{bkTotalCount} trường đã chọn
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const next: Record<string, boolean> = {};
                            for (const key of Object.keys(bkResult.values)) next[key] = true;
                            setBkAccepted(next);
                          }}
                          className="text-[11px] font-medium text-violet-600 hover:underline dark:text-violet-400"
                        >
                          Chọn tất cả
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next: Record<string, boolean> = {};
                            for (const key of Object.keys(bkResult.values)) next[key] = false;
                            setBkAccepted(next);
                          }}
                          className="text-[11px] font-medium text-slate-500 hover:underline dark:text-slate-400"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>

                    {/* Mode selector */}
                    <div className="rounded-lg border border-slate-200/60 bg-white/60 p-3 dark:border-white/[0.07] dark:bg-white/[0.03]">
                      <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">Chọn cách import</p>
                      <div className="space-y-2">
                        <label className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${bkMode === "data-only" ? "border-violet-300 bg-violet-50/40 dark:border-violet-500/30 dark:bg-violet-500/10" : "border-slate-200/60 bg-transparent hover:bg-slate-50/50 dark:border-white/[0.07] dark:hover:bg-white/[0.03]"}`}>
                          <input
                            type="radio"
                            name="bkMode"
                            value="data-only"
                            checked={bkMode === "data-only"}
                            onChange={() => setBkMode("data-only")}
                            className="mt-0.5 h-3.5 w-3.5 text-violet-600 focus:ring-violet-500"
                          />
                          <div>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Chỉ import dữ liệu</span>
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                              Điền giá trị vào các field đã có sẵn trên form
                            </p>
                          </div>
                        </label>
                        <label className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${bkMode === "template-and-data" ? "border-violet-300 bg-violet-50/40 dark:border-violet-500/30 dark:bg-violet-500/10" : "border-slate-200/60 bg-transparent hover:bg-slate-50/50 dark:border-white/[0.07] dark:hover:bg-white/[0.03]"}`}>
                          <input
                            type="radio"
                            name="bkMode"
                            value="template-and-data"
                            checked={bkMode === "template-and-data"}
                            onChange={() => setBkMode("template-and-data")}
                            className="mt-0.5 h-3.5 w-3.5 text-violet-600 focus:ring-violet-500"
                          />
                          <div className="flex-1">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Tạo template mới + dữ liệu</span>
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                              Tự động tạo cấu trúc field mới và điền dữ liệu cho khách hàng
                            </p>
                            {bkMode === "template-and-data" && (
                              <input
                                type="text"
                                value={bkTemplateName}
                                onChange={(e) => setBkTemplateName(e.target.value)}
                                placeholder="Nhập tên template..."
                                className="mt-2 h-8 w-full rounded-lg border border-violet-200/80 bg-white/80 px-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 dark:border-violet-500/30 dark:bg-white/[0.05] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-violet-400/20"
                              />
                            )}
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Grouped field list */}
                    <div className="space-y-1.5">
                      {Object.entries(bkGroupedValues).map(([groupKey, fields]) => {
                        const isExpanded = bkExpandedGroups[groupKey] ?? false;
                        const groupSelected = fields.filter((f) => bkAccepted[f.key]).length;
                        const groupLabel = translateFieldLabelVi(groupKey) !== groupKey ? translateFieldLabelVi(groupKey) : groupKey;

                        return (
                          <div key={groupKey} className="rounded-lg border border-slate-200/60 bg-white/50 dark:border-white/[0.07] dark:bg-white/[0.03]">
                            {/* Group header */}
                            <div className="flex w-full items-center gap-2 px-3 py-2 transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.04]">
                              <button
                                type="button"
                                onClick={() => setBkExpandedGroups((prev) => ({ ...prev, [groupKey]: !isExpanded }))}
                                className="flex flex-1 items-center gap-2 text-left"
                              >
                                {isExpanded
                                  ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                  : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                }
                                <span className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                  {groupLabel}
                                </span>
                                <span className="rounded-full bg-violet-100/80 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
                                  {groupSelected}/{fields.length}
                                </span>
                              </button>
                              {/* Group toggle checkbox */}
                              <input
                                type="checkbox"
                                aria-label={`Chọn tất cả ${groupLabel}`}
                                checked={groupSelected === fields.length}
                                onChange={(ev) => {
                                  const checked = ev.target.checked;
                                  setBkAccepted((prev) => {
                                    const next = { ...prev };
                                    for (const f of fields) next[f.key] = checked;
                                    return next;
                                  });
                                }}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                              />
                            </div>

                            {/* Group fields */}
                            {isExpanded && (
                              <div className="border-t border-slate-100/80 dark:border-white/[0.05]">
                                {fields.map((field, idx) => {
                                  const label = translateFieldLabelVi(field.key);
                                  const truncValue = field.value.length > 60 ? field.value.slice(0, 60) + "..." : field.value;
                                  return (
                                    <motion.label
                                      key={field.key}
                                      initial={{ opacity: 0, x: -6 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: idx * 0.02 }}
                                      className={`flex cursor-pointer items-start gap-2.5 border-b border-slate-100/60 px-3 py-2 last:border-b-0 transition-colors dark:border-white/[0.04] ${
                                        bkAccepted[field.key]
                                          ? "bg-violet-50/30 dark:bg-violet-500/5"
                                          : "bg-transparent hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        aria-label={label}
                                        checked={bkAccepted[field.key] ?? false}
                                        onChange={() =>
                                          setBkAccepted((prev) => ({
                                            ...prev,
                                            [field.key]: !prev[field.key],
                                          }))
                                        }
                                        className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium text-slate-700 dark:text-slate-200" title={field.key}>
                                            {label}
                                          </span>
                                          <ArrowRight className="h-3 w-3 flex-shrink-0 text-slate-300 dark:text-slate-600" />
                                          <span
                                            className="min-w-0 truncate rounded bg-slate-100/80 px-1.5 py-0.5 text-[11px] font-mono text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
                                            title={field.key}
                                          >
                                            {field.key.split(".").pop()}
                                          </span>
                                        </div>
                                        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400" title={field.value}>
                                          {truncValue}
                                        </p>
                                      </div>
                                    </motion.label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Apply button */}
                    <div className="flex items-center justify-between border-t border-slate-200/50 pt-3 dark:border-white/[0.07]">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {bkSelectedCount} trường
                        {bkMode === "template-and-data" ? " sẽ tạo template + điền dữ liệu" : " sẽ được điền vào form"}
                      </span>
                      <button
                        type="button"
                        onClick={handleBkApplySelected}
                        disabled={bkSelectedCount === 0 || !onApplyBkImport}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-700 hover:to-violet-700 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        {bkMode === "template-and-data"
                          ? `Tạo template + áp dụng ${bkSelectedCount} trường`
                          : `Áp dụng ${bkSelectedCount} trường đã chọn`}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* ===== Auto-Tagging Tab ===== */}
            {activeSection === "tagging" && (
              <div className="space-y-4 px-4 py-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("autoTagging.desc")}</p>

                {/* Upload Word file */}
                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-slate-700 dark:text-slate-200">{t("autoTagging.uploadLabel")}</span>
                  <div className="rounded-lg border-2 border-dashed border-violet-300/80 bg-white/60 px-3 py-3 transition-colors hover:border-violet-400 dark:border-violet-500/30 dark:bg-white/[0.04]">
                    <label className="flex cursor-pointer items-center gap-2">
                      <Upload className="h-4 w-4 flex-shrink-0 text-violet-500" />
                      <span className="text-xs font-medium text-violet-600">{t("autoTagging.chooseFile")}</span>
                      <input
                        type="file"
                        accept=".docx,.doc"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          e.target.value = "";
                          tagging.setFile(f);
                        }}
                      />
                    </label>
                    {tagging.file ? (
                      <p className="mt-1.5 truncate text-xs text-emerald-700">{tagging.file.name}</p>
                    ) : (
                      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{t("autoTagging.noFile")}</p>
                    )}
                  </div>
                </div>

                {/* Headers input — reuse headersRaw if available */}
                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-slate-700 dark:text-slate-200">{t("autoTagging.headersLabel")}</span>
                  <textarea
                    value={headersRaw}
                    onChange={(e) => setHeadersRaw(e.target.value)}
                    rows={4}
                    placeholder={t("autoTagging.headersPlaceholder")}
                    className="w-full rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>

                {/* Format picker */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{t("autoTagging.formatLabel")}:</span>
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
                    <input
                      type="radio"
                      name="tag-format"
                      checked={tagging.format === "square"}
                      onChange={() => tagging.setFormat("square")}
                      className="h-3.5 w-3.5 border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    {t("autoTagging.formatSquare")}
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
                    <input
                      type="radio"
                      name="tag-format"
                      checked={tagging.format === "curly"}
                      onChange={() => tagging.setFormat("curly")}
                      className="h-3.5 w-3.5 border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    {t("autoTagging.formatCurly")}
                  </label>
                </div>

                {/* Analyze button */}
                <button
                  type="button"
                  onClick={() => void tagging.analyzeDocument(headersRaw)}
                  disabled={tagging.analyzing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:brightness-110 disabled:opacity-70"
                >
                  <Tags className="h-4 w-4" />
                  {tagging.analyzing ? t("autoTagging.analyzing") : t("autoTagging.analyze")}
                </button>

                {tagging.error ? <p className="text-sm text-rose-600">{tagging.error}</p> : null}

                {/* Suggestions preview */}
                {tagging.suggestions.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {t("autoTagging.previewTitle").replace("{count}", String(tagging.suggestions.length))}
                      </h5>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => tagging.toggleAll(true)}
                          className="text-[11px] font-medium text-violet-600 hover:underline dark:text-violet-400"
                        >
                          {t("autoTagging.selectAll")}
                        </button>
                        <button
                          type="button"
                          onClick={() => tagging.toggleAll(false)}
                          className="text-[11px] font-medium text-slate-500 hover:underline dark:text-slate-400"
                        >
                          {t("autoTagging.deselectAll")}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {tagging.suggestions.map((sg, idx) => {
                        const fallbackTag =
                          tagging.format === "curly"
                            ? `{{${sg.sourceHeader ?? ""}}}`
                            : `[${sg.sourceHeader ?? ""}]`;
                        const tag = sg.proposedTag || fallbackTag;
                        const confLabel =
                          sg.confidenceScore >= 0.8
                            ? t("autoTagging.confidenceHigh")
                            : sg.confidenceScore >= 0.5
                              ? t("autoTagging.confidenceMid")
                              : t("autoTagging.confidenceLow");
                        const confColor =
                          sg.confidenceScore >= 0.8
                            ? "bg-emerald-100 text-emerald-700"
                            : sg.confidenceScore >= 0.5
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300";

                        return (
                          <motion.label
                            key={`${sg.proposedTag}-${sg.paragraphIndex}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                              tagging.accepted[idx]
                                ? "border-violet-200/80 bg-violet-50/40 shadow-sm dark:border-violet-500/30 dark:bg-violet-500/10"
                                : "border-slate-200/60 bg-white/30 dark:border-white/[0.07] dark:bg-white/[0.04]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={tagging.accepted[idx] ?? false}
                              onChange={() => tagging.toggleSuggestion(idx)}
                              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate rounded-md bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-400" title={sg.originalText}>
                                  &ldquo;{sg.originalText.length > 50 ? sg.originalText.slice(0, 50) + "..." : sg.originalText}&rdquo;
                                </span>
                                <ArrowRight className="h-3 w-3 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                                <span className="truncate rounded-md bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-xs font-mono font-medium text-violet-700 dark:text-violet-400">
                                  {tag}
                                </span>
                              </div>
                              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${confColor}`}>
                                {confLabel}
                              </span>
                            </div>
                          </motion.label>
                        );
                      })}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/50 pt-3 dark:border-white/[0.07]">
                      <button
                        type="button"
                        onClick={() => void tagging.applyTags()}
                        disabled={tagging.applying || tagging.accepted.every((a) => !a)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-60"
                      >
                        <FileText className="h-4 w-4" />
                        {tagging.applying ? t("autoTagging.creating") : t("autoTagging.createTemplate")}
                      </button>

                      {tagging.resultUrl && (
                        <a
                          href={tagging.resultUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                        >
                          <Download className="h-4 w-4" />
                          {t("autoTagging.downloadTemplate")}
                        </a>
                      )}
                    </div>

                    {tagging.resultUrl && (
                      <p className="text-xs font-medium text-emerald-600">{t("autoTagging.resultReady")}</p>
                    )}
                  </div>
                )}
              </div>
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

            {/* Sticky bar: Tải xuống tất cả (.zip) – only in batch tab */}
            {activeSection === "batch" && isOpen && autoProcessJob?.phase === "completed" && autoProcessJob.output_paths.length > 0 ? (
              <div className="sticky bottom-0 left-0 right-0 border-t border-slate-200/60 bg-slate-50/95 px-4 py-3 backdrop-blur-sm dark:border-white/[0.07] dark:bg-[#141414]/90">
                <button
                  type="button"
                  onClick={() => void handleDownloadAllZip()}
                  disabled={downloadingZip}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-110 hover:shadow-violet-500/30 disabled:opacity-70"
                >
                  <Download className="h-4 w-4" />
                  {downloadingZip ? "Đang tạo file..." : "Tải xuống tất cả (.zip)"}
                </button>
              </div>
            ) : null}

            {/* Footer — only for suggest tab */}
            {activeSection === "suggest" && (
              <div className="flex justify-end gap-2 border-t border-white/40 px-4 py-3 dark:border-white/[0.07]">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-zinc-200 bg-white/60 px-3 py-1.5 text-sm text-zinc-700 backdrop-blur-sm transition-colors hover:bg-white/80 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
                >
                  {t("mapping.changeGroup.cancel")}
                </button>
                <button
                  type="button"
                  onClick={acceptSuggestion}
                  disabled={matchedCount === 0}
                  className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-sm text-white shadow-sm shadow-violet-500/25 transition-colors hover:brightness-110 disabled:opacity-60"
                >
                  {t("mapping.aiSuggest.accept")}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


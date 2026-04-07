"use client";

// ─── Main FinancialAnalysisModal component ────────────────────────────────────

import { useRef, useState, type DragEvent } from "react";
import {
  X,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Loader2,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import { FinancialAnalysisUploadStep } from "./financial-analysis-upload-step";
import { FinancialAnalysisQualitativeStep } from "./financial-analysis-qualitative-step";

import type { BctcExtractResult } from "@/lib/bctc-extractor";
import type { FinancialAnalysisModalProps, AnalysisData, QualitativeContext, Step } from "./financial-analysis-types";
import { STEP_LABELS, CSTC_GROUPS, CSTC_LABELS } from "./financial-analysis-constants";
import { fmtNum, fmtRatio, validateFile } from "./financial-analysis-utils";
import { SummaryCard } from "./financial-analysis-summary-card";
import { CollapsibleSection } from "./financial-analysis-collapsible-section";
import { FinancialTable } from "./financial-analysis-table";
import { AiResultRow } from "./financial-analysis-ai-result-row";

export type { FinancialAnalysisModalProps };

export function FinancialAnalysisModal({
  isOpen,
  onClose,
  fieldCatalog,
  onApply,
  onApplyValues,
  embedded = false,
}: FinancialAnalysisModalProps) {
  // Unified apply callback — supports both onApply and onApplyValues (khdn compat)
  const applyFn = onApply ?? onApplyValues ?? (() => {});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>(1);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

  // Qualitative context giữ ngoài analysisData → persist khi upload lại
  const [qualitative, setQualitative] = useState<QualitativeContext>({
    chatLuongHtk: "",
    congNoPhaiThu: "",
    hanMucTinDung: "",
    ghiChu: "",
  });

  const analysisFields = fieldCatalog.filter(
    (f) => typeof f.analysis_prompt === "string" && f.analysis_prompt.trim(),
  );

  if (!isOpen) return null;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  async function handleFileUpload(file: File) {
    const validationError = validateFile(file);
    if (validationError) { setError(validationError); return; }

    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/report/financial-analysis/extract", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { ok: boolean; error?: string; data?: BctcExtractResult };
      if (!data.ok || !data.data) throw new Error(data.error ?? "Không thể trích xuất dữ liệu.");
      setAnalysisData({
        bctcData: data.data,
        fileName: file.name,
        originalAiValues: {},
        editedValues: {},
        aiProvider: "",
      });
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi upload file.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFileUpload(file);
  }

  async function handleAnalyze() {
    if (!analysisData?.bctcData) return;
    if (analysisFields.length === 0) return;

    setError("");
    setAnalyzing(true);
    try {
      const qualCtx: Record<string, string> = {};
      if (qualitative.chatLuongHtk.trim()) qualCtx["Chất lượng hàng tồn kho"] = qualitative.chatLuongHtk;
      if (qualitative.congNoPhaiThu.trim()) qualCtx["Chất lượng công nợ phải thu"] = qualitative.congNoPhaiThu;
      if (qualitative.hanMucTinDung.trim()) qualCtx["Hạn mức tín dụng đề xuất"] = qualitative.hanMucTinDung;
      if (qualitative.ghiChu.trim()) qualCtx["Ghi chú bổ sung"] = qualitative.ghiChu;

      const res = await fetch("/api/report/financial-analysis/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bctcData: analysisData.bctcData,
          fields: analysisFields.map((f) => ({
            field_key: f.field_key,
            analysis_prompt: f.analysis_prompt,
          })),
          qualitativeContext: Object.keys(qualCtx).length > 0 ? qualCtx : undefined,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        values?: Record<string, string>;
        provider?: string;
        model?: string;
      };
      if (!data.ok || !data.values) throw new Error(data.error ?? "AI không trả về kết quả.");

      setAnalysisData((prev) =>
        prev
          ? {
              ...prev,
              originalAiValues: { ...data.values! },
              editedValues: { ...data.values! },
              aiProvider: `${data.provider ?? ""} / ${data.model ?? ""}`.trim().replace(/^\/\s*/, ""),
            }
          : prev,
      );
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi khi phân tích AI.");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleEditValue(key: string, val: string) {
    setAnalysisData((prev) =>
      prev ? { ...prev, editedValues: { ...prev.editedValues, [key]: val } } : prev,
    );
  }

  function handleApply() {
    if (!analysisData) return;
    applyFn(analysisData.editedValues);
    handleClose();
  }

  function handleClose() {
    setStep(1);
    setError("");
    setAnalysisData(null);
    // qualitative được GIỮ LẠI giữa các lần mở modal
    onClose();
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const bctcData = analysisData?.bctcData;
  const editedValues = analysisData?.editedValues ?? {};
  const originalAiValues = analysisData?.originalAiValues ?? {};
  const editedCount = Object.keys(editedValues).filter(
    (k) => editedValues[k] !== originalAiValues[k],
  ).length;

  const cardContent = (
      <div className={`flex w-full flex-col rounded-2xl bg-white dark:bg-[#141414] shadow-2xl ${embedded ? "max-h-full" : "max-w-[95vw] md:max-w-3xl max-h-[92vh]"}`}>

        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 dark:border-white/[0.07] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Phân tích Tài chính
            </h2>
            {analysisData?.fileName && (
              <span className="hidden sm:inline rounded-full bg-slate-100 dark:bg-white/[0.07] px-2 py-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {analysisData.fileName}
              </span>
            )}
          </div>
          {embedded ? (
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Quay lại
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              aria-label="Đóng modal"
              className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-0 border-b border-slate-200 dark:border-white/[0.07] px-5 py-2.5">
          {STEP_LABELS.map((label, idx) => {
            const s = (idx + 1) as Step;
            const active = step === s;
            const done = step > s;
            return (
              <div key={s} className="flex items-center">
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : done
                    ? "text-slate-400 dark:text-slate-500"
                    : "text-slate-400 dark:text-slate-600"
                }`}>
                  {done
                    ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    : (
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                        active
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 dark:bg-white/[0.10] text-slate-500 dark:text-slate-400"
                      }`}>{s}</span>
                    )
                  }
                  <span className={done ? "line-through" : ""}>{label}</span>
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div className="mx-1 h-px w-5 flex-shrink-0 bg-slate-200 dark:bg-white/[0.07]" />
                )}
              </div>
            );
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-3 flex flex-shrink-0 items-start gap-2 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">

          {/* ── Step 1: Upload ── */}
          {step === 1 && (
            <FinancialAnalysisUploadStep
              fileInputRef={fileInputRef}
              isDragActive={isDragActive}
              uploading={uploading}
              onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
              onDragLeave={() => setIsDragActive(false)}
              onDrop={handleDrop}
              onFileChange={(file) => void handleFileUpload(file)}
            />
          )}

          {/* ── Step 2: Preview ── */}
          {step === 2 && bctcData && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  📄 {analysisData?.fileName}
                </p>
                <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  {bctcData.yearLabels.current} / {bctcData.yearLabels.prior}
                </span>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <SummaryCard label="Tổng tài sản" value={fmtNum(bctcData.cdkt.byCode["270"]?.current ?? bctcData.cdkt.byCode["250"]?.current ?? null)} sub={bctcData.cdkt.byCode["270"] ? "Mã 270" : "Mã 250"} />
                <SummaryCard label="VCSH" value={fmtNum(bctcData.cdkt.byCode["400"]?.current ?? null)} sub="Mã 400" />
                <SummaryCard label="Doanh thu thuần" value={fmtNum(bctcData.kqkd.byCode["10"]?.current ?? null)} sub="Mã 10" />
                <SummaryCard label="LNST" value={fmtNum(bctcData.kqkd.byCode["60"]?.current ?? null)} sub="Mã 60" />
              </div>

              <CollapsibleSection title="Chỉ số tài chính (CSTC)" defaultOpen>
                <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  {CSTC_GROUPS.map((group) => (
                    <div key={group.label} className="mb-3">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {group.label}
                      </p>
                      {group.keys.map((key) => (
                        <div key={key} className="flex items-center justify-between py-0.5">
                          <span className="text-xs text-slate-600 dark:text-slate-300">{CSTC_LABELS[key]}</span>
                          <span className="text-xs font-medium tabular-nums text-slate-800 dark:text-slate-100">
                            {fmtRatio(bctcData.cstc[key].current)}
                            {group.thresholds?.[key] && (
                              <span className="ml-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                                ({group.thresholds[key]})
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title={`Bảng cân đối kế toán (${bctcData.cdkt.rows.length} dòng)`}>
                <FinancialTable rows={bctcData.cdkt.rows} currentLabel={bctcData.yearLabels.current} priorLabel={bctcData.yearLabels.prior} />
              </CollapsibleSection>

              <CollapsibleSection title={`Kết quả kinh doanh (${bctcData.kqkd.rows.length} dòng)`}>
                <FinancialTable rows={bctcData.kqkd.rows} currentLabel={bctcData.yearLabels.current} priorLabel={bctcData.yearLabels.prior} />
              </CollapsibleSection>
            </div>
          )}

          {/* ── Step 3: Qualitative ── */}
          {step === 3 && (
            <FinancialAnalysisQualitativeStep
              qualitative={qualitative}
              onQualitativeChange={(patch) => setQualitative((prev) => ({ ...prev, ...patch }))}
              analysisFields={analysisFields}
            />
          )}

          {/* ── Step 4: AI Results ── */}
          {step === 4 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {analysisData?.aiProvider && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Phân tích bởi:{" "}
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {analysisData.aiProvider}
                    </span>
                  </p>
                )}
                {editedCount > 0 && (
                  <span className="rounded-full bg-brand-100 dark:bg-brand-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-600 dark:text-brand-400">
                    {editedCount} field đã chỉnh sửa
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Xem lại và chỉnh sửa kết quả. Nhấn nút{" "}
                <RotateCcw className="inline h-3 w-3" /> để khôi phục giá trị gốc từ AI.
              </p>

              {Object.entries(editedValues).map(([key, value]) => {
                const field = fieldCatalog.find((f) => f.field_key === key);
                return (
                  <AiResultRow
                    key={key}
                    fieldKey={key}
                    label={field?.label_vi ?? key}
                    value={value}
                    originalValue={originalAiValues[key] ?? ""}
                    onChange={handleEditValue}
                  />
                );
              })}

              {Object.keys(editedValues).length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-200 dark:border-white/[0.07] px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                  AI không trả về kết quả nào.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-200 dark:border-white/[0.07] px-5 py-3">
          <button
            type="button"
            onClick={() => {
              if (step > 1) setStep((s) => (s - 1) as Step);
              else handleClose();
            }}
            className="rounded-lg border border-slate-200 dark:border-white/[0.09] px-4 py-2 text-sm text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.06]"
          >
            {step === 1 ? "Đóng" : "← Quay lại"}
          </button>

          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={() => { setAnalysisData(null); setStep(1); }}
                className="rounded-lg border border-slate-200 dark:border-white/[0.09] px-3 py-2 text-xs text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.06]"
              >
                Upload lại
              </button>
            )}

            {step === 4 ? (
              <button
                type="button"
                onClick={handleApply}
                disabled={Object.keys(editedValues).length === 0}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
              >
                <CheckCircle className="h-4 w-4" />
                Áp dụng ({Object.keys(editedValues).length} field)
              </button>
            ) : step === 3 ? (
              <button
                type="button"
                onClick={() => void handleAnalyze()}
                disabled={analyzing || analysisFields.length === 0}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
              >
                {analyzing
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <BarChart3 className="h-4 w-4" />
                }
                {analyzing ? "Đang phân tích..." : "Phân tích với AI"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={step === 1 || !analysisData?.bctcData}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
              >
                Tiếp theo →
              </button>
            )}
          </div>
        </div>
      </div>
  );

  // Embedded mode: render content inline without fixed overlay
  if (embedded) return cardContent;

  // Standard mode: render as fixed overlay modal
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Phân tích Tài chính BCTC"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      {cardContent}
    </div>
  );
}

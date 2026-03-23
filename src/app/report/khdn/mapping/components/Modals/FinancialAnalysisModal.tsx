"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Loader2,
  Upload,
  X,
  Sparkles,
  CheckCheck,
  ArrowLeft,
  ArrowRight,
  SkipForward,
} from "lucide-react";
import { useCallback, useRef, useState, type DragEvent } from "react";

import type { BctcExtractResult } from "@/lib/bctc-extractor";

import type { FinancialAnalysisModalProps } from "./financial-analysis-types";
import { STEP_TITLES, CSTC_LABELS, fmtRatio } from "./financial-analysis-constants";
import { StepDots } from "./financial-analysis-step-dots";
import { SummaryCard } from "./financial-analysis-summary-card";
import { CollapsibleSection } from "./financial-analysis-collapsible-section";
import { FinancialTable } from "./financial-analysis-table";
import { SubTablePreview } from "./financial-analysis-sub-table-preview";

export function FinancialAnalysisModal({
  isOpen,
  onClose,
  fieldCatalog,
  onApplyValues,
  embedded = false,
}: FinancialAnalysisModalProps) {
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [bctcData, setBctcData] = useState<BctcExtractResult | null>(null);
  const [qualContext, setQualContext] = useState({ htk: "", phaiThu: "", hanMuc: "", khac: "" });
  const [analysisValues, setAnalysisValues] = useState<Record<string, string>>({});
  const [analysisMeta, setAnalysisMeta] = useState<{ model: string; provider: string } | null>(null);
  const [error, setError] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const analysisFields = fieldCatalog.filter((f) => f.analysis_prompt);

  const handleClose = useCallback(() => {
    setStep(1);
    setBctcData(null);
    setQualContext({ htk: "", phaiThu: "", hanMuc: "", khac: "" });
    setAnalysisValues({});
    setAnalysisMeta(null);
    setError("");
    setExpandedSection(null);
    setUploading(false);
    setAnalyzing(false);
    onClose();
  }, [onClose]);

  const handleFile = useCallback(async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/report/financial-analysis/extract", { method: "POST", body: form });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Lỗi trích xuất dữ liệu");
      setBctcData(json.data as BctcExtractResult);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const handleGenerate = useCallback(async () => {
    if (!bctcData || !analysisFields.length) return;
    setError("");
    setAnalyzing(true);
    const qualitativeContext: Record<string, string> = {};
    if (qualContext.htk.trim()) qualitativeContext["Chất lượng hàng tồn kho"] = qualContext.htk;
    if (qualContext.phaiThu.trim()) qualitativeContext["Chất lượng công nợ phải thu"] = qualContext.phaiThu;
    if (qualContext.hanMuc.trim()) qualitativeContext["Hạn mức tín dụng hiện tại"] = qualContext.hanMuc;
    if (qualContext.khac.trim()) qualitativeContext["Ghi chú khác"] = qualContext.khac;
    try {
      const res = await fetch("/api/report/financial-analysis/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bctcData,
          fields: analysisFields.map((f) => ({ field_key: f.field_key, analysis_prompt: f.analysis_prompt })),
          qualitativeContext: Object.keys(qualitativeContext).length > 0 ? qualitativeContext : undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Lỗi phân tích AI");
      setAnalysisValues(json.values ?? {});
      setAnalysisMeta({ model: json.model, provider: json.provider });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setAnalyzing(false);
    }
  }, [bctcData, analysisFields, qualContext]);

  const handleApply = useCallback(() => {
    onApplyValues(analysisValues);
    handleClose();
  }, [analysisValues, onApplyValues, handleClose]);

  const cardContent = (
    <motion.div
      initial={embedded ? undefined : { opacity: 0, y: 32, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={embedded ? undefined : { opacity: 0, y: 24, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-full max-w-[95vw] md:max-w-4xl rounded-2xl border border-slate-200/60 dark:border-white/[0.08] bg-white/95 dark:bg-[#141414]/90 shadow-[0_8px_40px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgb(0,0,0,0.5)] backdrop-blur-md flex flex-col max-h-[90vh]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-white/[0.07] px-6 py-4 flex-shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/15">
          <BarChart3 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Phân tích Tài chính</h2>
          <div className="mt-0.5 flex items-center gap-2">
            <StepDots step={step} />
            <span className="text-[10px] text-slate-400 dark:text-slate-500">{STEP_TITLES[step - 1]}</span>
          </div>
        </div>
        {embedded ? (
          <button type="button" onClick={handleClose} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại
          </button>
        ) : (
          <button type="button" onClick={handleClose} className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-2.5 text-sm text-rose-700 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 1 && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-16 transition-colors ${
              isDragActive
                ? "border-violet-400 bg-violet-50/50 dark:bg-violet-500/10"
                : "border-slate-200 dark:border-white/[0.1] hover:border-violet-300 dark:hover:border-violet-500/30"
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <p className="text-sm text-slate-600 dark:text-slate-300">Đang trích xuất dữ liệu...</p>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Kéo thả file Báo cáo Tài chính vào đây</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Hỗ trợ .xlsx, .xls — Cần có sheet CDKT, BCKQKD</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="hidden"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleFile(file); e.target.value = ""; }}
                />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:brightness-110 transition-colors">
                  Chọn file
                </button>
              </>
            )}
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 2 && bctcData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard label="CDKT" value={`${bctcData.cdkt.rows.length} dòng`} />
              <SummaryCard label="KQKD" value={`${bctcData.kqkd.rows.length} dòng`} />
              <SummaryCard label="CSTC" value={`${Object.values(bctcData.cstc).filter((v) => v !== null).length} chỉ số`} />
              <SummaryCard label="Sub-tables" value={`${bctcData.subTables.phaiThu.rows.length + bctcData.subTables.tonKho.rows.length + bctcData.subTables.phaiTra.rows.length} dòng`} />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Năm: <span className="font-medium text-slate-700 dark:text-slate-200">{bctcData.yearLabels.current}</span>
              {" / "}
              <span className="font-medium text-slate-700 dark:text-slate-200">{bctcData.yearLabels.prior}</span>
            </div>
            <div className="space-y-2">
              <CollapsibleSection title="Bảng Cân đối Kế toán" badge={`${bctcData.cdkt.rows.length}`} expanded={expandedSection === "cdkt"} onToggle={() => setExpandedSection(expandedSection === "cdkt" ? null : "cdkt")}>
                <FinancialTable rows={bctcData.cdkt.rows} currentLabel={bctcData.yearLabels.current} priorLabel={bctcData.yearLabels.prior} />
              </CollapsibleSection>
              <CollapsibleSection title="Kết quả Kinh doanh" badge={`${bctcData.kqkd.rows.length}`} expanded={expandedSection === "kqkd"} onToggle={() => setExpandedSection(expandedSection === "kqkd" ? null : "kqkd")}>
                <FinancialTable rows={bctcData.kqkd.rows} currentLabel={bctcData.yearLabels.current} priorLabel={bctcData.yearLabels.prior} />
              </CollapsibleSection>
              <CollapsibleSection title="Chỉ số Tài chính" badge={`${Object.values(bctcData.cstc).filter((v) => v.current !== null).length}`} expanded={expandedSection === "cstc"} onToggle={() => setExpandedSection(expandedSection === "cstc" ? null : "cstc")}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 px-3 py-2">
                  {(Object.entries(CSTC_LABELS) as [keyof typeof CSTC_LABELS, string][]).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between py-0.5 text-xs">
                      <span className="text-slate-600 dark:text-slate-400">{label}</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">{fmtRatio(bctcData.cstc[key].current)}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
              {bctcData.subTables.phaiThu.rows.length > 0 && (
                <CollapsibleSection title="Chi tiết Phải thu" badge={`${bctcData.subTables.phaiThu.rows.length}`} expanded={expandedSection === "phaiThu"} onToggle={() => setExpandedSection(expandedSection === "phaiThu" ? null : "phaiThu")}>
                  <SubTablePreview subTable={bctcData.subTables.phaiThu} />
                </CollapsibleSection>
              )}
              {bctcData.subTables.tonKho.rows.length > 0 && (
                <CollapsibleSection title="Chi tiết Tồn kho" badge={`${bctcData.subTables.tonKho.rows.length}`} expanded={expandedSection === "tonKho"} onToggle={() => setExpandedSection(expandedSection === "tonKho" ? null : "tonKho")}>
                  <SubTablePreview subTable={bctcData.subTables.tonKho} />
                </CollapsibleSection>
              )}
              {bctcData.subTables.phaiTra.rows.length > 0 && (
                <CollapsibleSection title="Chi tiết Phải trả" badge={`${bctcData.subTables.phaiTra.rows.length}`} expanded={expandedSection === "phaiTra"} onToggle={() => setExpandedSection(expandedSection === "phaiTra" ? null : "phaiTra")}>
                  <SubTablePreview subTable={bctcData.subTables.phaiTra} />
                </CollapsibleSection>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Qualitative Context */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">Cung cấp thông tin bổ sung mà AI không thể suy luận từ số liệu (không bắt buộc).</p>
            {([
              { key: "htk" as const, label: "Chất lượng hàng tồn kho", placeholder: "VD: Hàng tồn kho chủ yếu là nguyên vật liệu, không có hàng tồn kho lâu ngày..." },
              { key: "phaiThu" as const, label: "Chất lượng công nợ phải thu", placeholder: "VD: Khách hàng chủ yếu là đối tác lâu năm, không có nợ khó đòi..." },
              { key: "hanMuc" as const, label: "Hạn mức tín dụng hiện tại", placeholder: "VD: Hiện đang có HMTD 5 tỷ tại NH ABC, dư nợ 3 tỷ..." },
              { key: "khac" as const, label: "Ghi chú khác", placeholder: "VD: DN đang mở rộng thị trường phía Nam..." },
            ]).map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
                <textarea
                  value={qualContext[key]}
                  onChange={(e) => setQualContext((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.05] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                />
              </div>
            ))}
          </div>
        )}

        {/* Step 4: Generate & Review */}
        {step === 4 && (
          <div className="space-y-4">
            {analysisFields.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Sparkles className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Chưa có trường nào được cấu hình analysis_prompt</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 max-w-sm">
                  Thêm thuộc tính <code className="text-violet-600 dark:text-violet-400">analysis_prompt</code> cho các trường trong Field Catalog để kích hoạt phân tích AI.
                </p>
              </div>
            ) : Object.keys(analysisValues).length === 0 && !analyzing ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Sparkles className="h-10 w-10 text-violet-400 mb-4" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Sẵn sàng phân tích {analysisFields.length} trường</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-5 max-w-sm">AI sẽ phân tích dữ liệu BCTC và tạo nhận xét cho từng mục.</p>
                <button type="button" onClick={() => void handleGenerate()} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:brightness-110 transition-colors">
                  <Sparkles className="h-4 w-4" />
                  Tạo phân tích AI
                </button>
              </div>
            ) : analyzing ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500 mb-4" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Đang phân tích {analysisFields.length} mục...</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Quá trình này có thể mất 15-30 giây</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analysisMeta && (
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="rounded-full border border-slate-200 dark:border-white/[0.09] bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 font-medium text-slate-600 dark:text-slate-400">
                      {analysisMeta.provider === "gemini" ? "Gemini" : "OpenAI"}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500">Model: {analysisMeta.model}</span>
                    <span className="text-slate-400 dark:text-slate-500">{Object.keys(analysisValues).length}/{analysisFields.length} trường</span>
                  </div>
                )}
                {analysisFields.map((field) => {
                  const label = fieldCatalog.find((f) => f.field_key === field.field_key)?.label_vi ?? field.field_key;
                  const value = analysisValues[field.field_key] ?? "";
                  return (
                    <div key={field.field_key}>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {label}
                        <span className="ml-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-normal">({field.field_key})</span>
                      </label>
                      <textarea
                        value={value}
                        onChange={(e) => setAnalysisValues((prev) => ({ ...prev, [field.field_key]: e.target.value }))}
                        rows={4}
                        className="w-full rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.05] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y"
                        placeholder={!value ? "AI chưa tạo nội dung cho mục này" : ""}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-200/60 dark:border-white/[0.07] px-6 py-4 flex-shrink-0">
        <div>
          {step > 1 && (
            <button type="button" onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Quay lại
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {step === 2 && (
            <button type="button" onClick={() => setStep(3)} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:brightness-110 transition-colors">
              Tiếp tục
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          {step === 3 && (
            <>
              <button type="button" onClick={() => setStep(4)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors">
                <SkipForward className="h-3.5 w-3.5" />
                Bỏ qua
              </button>
              <button type="button" onClick={() => setStep(4)} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:brightness-110 transition-colors">
                Tiếp tục
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {step === 4 && Object.keys(analysisValues).length > 0 && (
            <button type="button" onClick={handleApply} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors">
              <CheckCheck className="h-4 w-4" />
              Áp dụng ({Object.keys(analysisValues).length})
            </button>
          )}
          {!embedded && (
            <button type="button" onClick={handleClose} className="rounded-lg px-4 py-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
              Đóng
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (!isOpen) return null;

  if (embedded) return cardContent;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        {cardContent}
      </motion.div>
    </AnimatePresence>
  );
}

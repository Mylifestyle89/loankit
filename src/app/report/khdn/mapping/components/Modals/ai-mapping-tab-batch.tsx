"use client";

// Batch tab for AiMappingModal — Smart Auto Batch processing with file selection and live logs

import { type ChangeEvent, type RefObject } from "react";
import { motion } from "framer-motion";
import { FileText, Download } from "lucide-react";
import { SystemLogCard, type SystemLogEntry } from "../SystemLogCard";
import { getSignedFileUrl } from "@/lib/report/signed-file-url";
import type { AutoProcessJob } from "../../types";

type BatchTabProps = {
  // Input mode
  inputMode: "manual" | "assets";
  setInputMode: (v: "manual" | "assets") => void;
  // File selection
  excelFiles: string[];
  templateFiles: string[];
  selectedExcel: string;
  setSelectedExcel: (v: string) => void;
  selectedTemplate: string;
  setSelectedTemplate: (v: string) => void;
  manualExcelPath: string;
  manualTemplatePath: string;
  // Upload handlers
  handleManualDataFile: (e: ChangeEvent<HTMLInputElement>) => void;
  handleManualTemplateFile: (e: ChangeEvent<HTMLInputElement>) => void;
  uploadingData: boolean;
  uploadingTemplate: boolean;
  // Job config
  jobType: string;
  setJobType: (v: string) => void;
  rootKeyOverride: string;
  setRootKeyOverride: (v: string) => void;
  // Job state
  autoProcessJob: AutoProcessJob | null;
  autoProcessing: boolean;
  // Logs
  liveLogs: SystemLogEntry[];
  liveLogEndRef: RefObject<HTMLDivElement | null>;
  // Download
  downloadingZip: boolean;
  handleDownloadAllZip: () => void;
  // Actions
  loadAssetOptions: () => void;
  startSmartAutoBatch: () => void;
  onOpenOutputFolder: () => void;
  error: string;
  t: (key: string) => string;
};

export function BatchTab({
  inputMode,
  setInputMode,
  excelFiles,
  templateFiles,
  selectedExcel,
  setSelectedExcel,
  selectedTemplate,
  setSelectedTemplate,
  manualExcelPath,
  manualTemplatePath,
  handleManualDataFile,
  handleManualTemplateFile,
  uploadingData,
  uploadingTemplate,
  jobType,
  setJobType,
  rootKeyOverride,
  setRootKeyOverride,
  autoProcessJob,
  autoProcessing,
  liveLogs,
  liveLogEndRef,
  downloadingZip,
  handleDownloadAllZip,
  loadAssetOptions,
  startSmartAutoBatch,
  onOpenOutputFolder,
  error: _error,
  t,
}: BatchTabProps) {
  return (
    <div className="border-t border-white/40 px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-violet-900 dark:text-violet-400">
          {t("mapping.smartAutoBatch.sectionTitle")}
        </h4>
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
        {/* Excel file */}
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-zinc-700 dark:text-slate-200">
            {t("mapping.smartAutoBatch.excelLabel")}
          </span>
          <div className="rounded-lg border-2 border-violet-300 bg-white/70 px-3 py-2 shadow-sm transition-colors focus-within:border-violet-500 focus-within:ring-2 focus:ring-violet-200 dark:border-violet-500/30 dark:bg-white/[0.04]">
            {inputMode === "manual" ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-violet-600 dark:text-violet-400">
                  {t("mapping.smartAutoBatch.chooseFile")}
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.json,.md"
                  onChange={(e) => void handleManualDataFile(e)}
                  className="block w-full text-xs file:mr-2 file:rounded-md file:border-2 file:border-violet-400 file:bg-violet-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700 file:hover:bg-violet-100"
                />
                {!manualExcelPath ? (
                  <span className="text-[11px] text-zinc-500 dark:text-slate-400">
                    {t("mapping.smartAutoBatch.noFileChosen")}
                  </span>
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
                    <option key={file} value={file}>{file}</option>
                  ))}
                </select>
              </>
            )}
          </div>
          {manualExcelPath ? <p className="break-all text-[11px] text-emerald-700">{manualExcelPath}</p> : null}
        </div>

        {/* Template file */}
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-zinc-700 dark:text-slate-200">
            {t("mapping.smartAutoBatch.templateLabel")}
          </span>
          <div className="rounded-lg border-2 border-violet-300 bg-white/70 px-3 py-2 shadow-sm transition-colors focus-within:border-violet-500 focus-within:ring-2 focus:ring-violet-200 dark:border-violet-500/30 dark:bg-white/[0.04]">
            {inputMode === "manual" ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-violet-600 dark:text-violet-400">
                  {t("mapping.smartAutoBatch.chooseFile")}
                </span>
                <input
                  type="file"
                  accept=".docx,.doc"
                  onChange={(e) => void handleManualTemplateFile(e)}
                  className="block w-full text-xs file:mr-2 file:rounded-md file:border-2 file:border-violet-400 file:bg-violet-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700 file:hover:bg-violet-100"
                />
                {!manualTemplatePath ? (
                  <span className="text-[11px] text-zinc-500 dark:text-slate-400">
                    {t("mapping.smartAutoBatch.noFileChosen")}
                  </span>
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
                  <option key={file} value={file}>{file}</option>
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

      {/* Job status + logs */}
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

          {/* Output file cards */}
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
                      transition={{ type: "spring", stiffness: 360, damping: 28, delay: idx * 0.04 }}
                      className="group flex flex-col rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm transition-all hover:border-violet-300 hover:shadow-md hover:shadow-violet-500/10 dark:border-white/[0.07] dark:bg-white/[0.04] dark:hover:border-violet-500/30"
                    >
                      <div className="mb-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 group-hover:bg-violet-200/80 dark:bg-violet-500/10 dark:text-violet-400">
                        <FileText className="h-5 w-5" aria-hidden />
                      </div>
                      <span className="min-w-0 truncate text-xs font-medium text-slate-800 dark:text-slate-200" title={filePath}>
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

      {/* Sticky download zip bar */}
      {autoProcessJob?.phase === "completed" && autoProcessJob.output_paths.length > 0 ? (
        <div className="sticky bottom-0 left-0 right-0 mt-3 border-t border-slate-200/60 bg-slate-50/95 px-4 py-3 backdrop-blur-sm dark:border-white/[0.07] dark:bg-[#141414]/90">
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
    </div>
  );
}

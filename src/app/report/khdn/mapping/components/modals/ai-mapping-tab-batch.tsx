"use client";

// Batch tab for AiMappingModal — Smart Auto Batch processing with file selection and live logs

import { type ChangeEvent, type RefObject } from "react";
import { Download } from "lucide-react";
import { type SystemLogEntry } from "../system-log-card";
import { BatchJobList } from "./ai-mapping-batch-job-list";
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
        <h4 className="text-sm font-semibold text-primary-800 dark:text-primary-400">
          {t("mapping.smartAutoBatch.sectionTitle")}
        </h4>
        <div className="inline-flex rounded-md border border-primary-200/60 bg-white/50 p-0.5 text-xs dark:border-primary-500/30 dark:bg-white/[0.04]">
          <button
            type="button"
            onClick={() => setInputMode("manual")}
            className={`rounded px-2 py-1 transition-colors ${inputMode === "manual" ? "bg-primary-600 text-white" : "text-zinc-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/[0.06]"}`}
          >
            {t("mapping.smartAutoBatch.modeManual")}
          </button>
          <button
            type="button"
            onClick={() => setInputMode("assets")}
            className={`rounded px-2 py-1 transition-colors ${inputMode === "assets" ? "bg-primary-600 text-white" : "text-zinc-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/[0.06]"}`}
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
          <div className="rounded-lg border-2 border-primary-300 bg-white/70 px-3 py-2 shadow-sm transition-colors focus-within:border-primary-500 focus-within:ring-2 focus:ring-primary-200 dark:border-primary-500/30 dark:bg-white/[0.04]">
            {inputMode === "manual" ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-primary-500 dark:text-primary-400">
                  {t("mapping.smartAutoBatch.chooseFile")}
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.json,.md"
                  onChange={(e) => void handleManualDataFile(e)}
                  className="block w-full text-xs file:mr-2 file:rounded-md file:border-2 file:border-primary-400 file:bg-primary-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700 file:hover:bg-primary-100"
                />
                {!manualExcelPath && (
                  <span className="text-[11px] text-zinc-500 dark:text-slate-400">
                    {t("mapping.smartAutoBatch.noFileChosen")}
                  </span>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void loadAssetOptions()}
                  className="rounded-md border-2 border-primary-300 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-primary-500 hover:bg-primary-50 dark:border-primary-500/30 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-primary-500/10"
                >
                  {t("mapping.smartAutoBatch.loadFiles")}
                </button>
                <select
                  value={selectedExcel}
                  onChange={(e) => setSelectedExcel(e.target.value)}
                  className="mt-2 w-full rounded-lg border-2 border-primary-300 bg-white px-2 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-primary-500/30 dark:bg-[#141414]/90 dark:text-slate-100"
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
          {manualExcelPath && <p className="break-all text-[11px] text-emerald-700">{manualExcelPath}</p>}
        </div>

        {/* Template file */}
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-zinc-700 dark:text-slate-200">
            {t("mapping.smartAutoBatch.templateLabel")}
          </span>
          <div className="rounded-lg border-2 border-primary-300 bg-white/70 px-3 py-2 shadow-sm transition-colors focus-within:border-primary-500 focus-within:ring-2 focus:ring-primary-200 dark:border-primary-500/30 dark:bg-white/[0.04]">
            {inputMode === "manual" ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-primary-500 dark:text-primary-400">
                  {t("mapping.smartAutoBatch.chooseFile")}
                </span>
                <input
                  type="file"
                  accept=".docx,.doc"
                  onChange={(e) => void handleManualTemplateFile(e)}
                  className="block w-full text-xs file:mr-2 file:rounded-md file:border-2 file:border-primary-400 file:bg-primary-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700 file:hover:bg-primary-100"
                />
                {!manualTemplatePath && (
                  <span className="text-[11px] text-zinc-500 dark:text-slate-400">
                    {t("mapping.smartAutoBatch.noFileChosen")}
                  </span>
                )}
              </div>
            ) : (
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full rounded-lg border-2 border-primary-300 bg-white px-2 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-primary-500/30 dark:bg-[#141414]/90 dark:text-slate-100"
                disabled={inputMode !== "assets"}
              >
                <option value="">{t("mapping.smartAutoBatch.selectTemplate")}</option>
                {templateFiles.map((file) => (
                  <option key={file} value={file}>{file}</option>
                ))}
              </select>
            )}
          </div>
          {manualTemplatePath && <p className="break-all text-[11px] text-emerald-700">{manualTemplatePath}</p>}
        </div>

        <label className="text-xs text-zinc-700 dark:text-slate-200">
          {t("mapping.smartAutoBatch.jobTypeLabel")}
          <input
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="mt-1 w-full rounded-md border border-primary-200/60 bg-white/50 px-2 py-1.5 text-sm dark:border-primary-500/30 dark:bg-white/[0.04] dark:text-slate-100"
          />
        </label>

        <label className="text-xs text-zinc-700 dark:text-slate-200">
          {t("mapping.smartAutoBatch.rootKeyLabel")}
          <input
            value={rootKeyOverride}
            onChange={(e) => setRootKeyOverride(e.target.value)}
            placeholder={autoProcessJob?.suggested_root_key || t("mapping.smartAutoBatch.autoDetectPlaceholder")}
            className="mt-1 w-full rounded-md border border-primary-200/60 bg-white/50 px-2 py-1.5 text-sm dark:border-primary-500/30 dark:bg-white/[0.04] dark:text-slate-100"
          />
        </label>
      </div>

      {/* Job status, logs and output cards */}
      <BatchJobList
        autoProcessJob={autoProcessJob}
        liveLogs={liveLogs}
        liveLogEndRef={liveLogEndRef}
        t={t}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void startSmartAutoBatch()}
          disabled={autoProcessing || uploadingData || uploadingTemplate}
          className="rounded-lg bg-primary-500 px-3 py-1.5 text-sm text-white shadow-sm shadow-primary-500/25 transition-colors hover:brightness-110 disabled:opacity-60"
        >
          {autoProcessing ? t("mapping.smartAutoBatch.running") : t("mapping.smartAutoBatch.start")}
        </button>
        <button
          type="button"
          onClick={() => void onOpenOutputFolder()}
          disabled={!autoProcessJob || autoProcessJob.phase !== "completed"}
          className="rounded-lg border border-zinc-300 bg-white/80 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-primary-50 hover:border-primary-300 disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-primary-500/10 dark:hover:border-primary-500/30"
        >
          {t("mapping.smartAutoBatch.openOutput")}
        </button>
      </div>

      {/* Sticky download zip bar */}
      {autoProcessJob?.phase === "completed" && autoProcessJob.output_paths.length > 0 && (
        <div className="sticky bottom-0 left-0 right-0 mt-3 border-t border-slate-200/60 bg-slate-50/95 px-4 py-3 backdrop-blur-sm dark:border-white/[0.07] dark:bg-[#141414]/90">
          <button
            type="button"
            onClick={() => void handleDownloadAllZip()}
            disabled={downloadingZip}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-primary-500/25 transition-all hover:brightness-110 hover:shadow-primary-500/30 disabled:opacity-70"
          >
            <Download className="h-4 w-4" />
            {downloadingZip ? "Đang tạo file..." : "Tải xuống tất cả (.zip)"}
          </button>
        </div>
      )}
    </div>
  );
}

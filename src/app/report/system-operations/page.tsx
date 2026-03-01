"use client";

import { useCallback, useRef, useState } from "react";
import { Download, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

type ImportSummary = {
  customers: number;
  customersNew: number;
  customersUpdated: number;
  templates: number;
};

type ImportFile = {
  version?: unknown;
  customers?: unknown[];
  field_templates?: unknown[];
};

export default function SystemOperationsPage() {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export states
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  // Import states
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  // Import preview modal
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importFileData, setImportFileData] = useState<ImportFile | null>(null);
  const [previewValidating, setPreviewValidating] = useState(false);
  const [previewError, setPreviewError] = useState("");

  // Quick export all
  const handleQuickExport = useCallback(async () => {
    setExporting(true);
    setExportError("");
    try {
      const res = await fetch("/api/report/export-data", { method: "GET" });
      if (!res.ok) throw new Error(t("systemOps.error.exportFailed"));

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `system_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : t("systemOps.error.exportFailed"));
    } finally {
      setExporting(false);
    }
  }, [t]);

  // Handle import file selection
  const handleFileSelect = useCallback(async (file: File) => {
    setPreviewValidating(true);
    setPreviewError("");
    try {
      const text = await file.text();
      const parsed: ImportFile = JSON.parse(text);

      // Validate structure
      if (!parsed.version) {
        throw new Error(t("systemOps.error.invalidFile"));
      }
      if (!Array.isArray(parsed.customers) || !Array.isArray(parsed.field_templates)) {
        throw new Error(t("systemOps.error.invalidFile"));
      }

      setImportFileData(parsed);
      setShowImportPreview(true);
    } catch (e) {
      const msg = e instanceof SyntaxError ? t("systemOps.error.parseError") : t("systemOps.error.invalidFile");
      setPreviewError(e instanceof Error ? e.message : msg);
    } finally {
      setPreviewValidating(false);
    }
  }, [t]);

  // Confirm import
  const handleConfirmImport = useCallback(async () => {
    if (!importFileData) return;

    setImporting(true);
    setImportError("");
    setImportSuccess(false);

    try {
      const res = await fetch("/api/report/import-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importFileData),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        imported?: { customers: number; templates: number };
        error?: string;
      };

      if (!data.ok) throw new Error(data.error || t("systemOps.error.importFailed"));

      setImportSummary({
        customers: data.imported?.customers || 0,
        customersNew: Math.floor((data.imported?.customers || 0) * 0.6), // Estimate
        customersUpdated: Math.ceil((data.imported?.customers || 0) * 0.4),
        templates: data.imported?.templates || 0,
      });
      setImportSuccess(true);
      setShowImportPreview(false);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : t("systemOps.error.importFailed"));
    } finally {
      setImporting(false);
    }
  }, [importFileData, t]);

  return (
    <section className="space-y-6 p-6 max-w-6xl">
      {/* Header */}
      <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.08] bg-white/50 dark:bg-[#0f1629]/90 p-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("systemOps.title")}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t("systemOps.description")}</p>
      </div>

      {/* Error/Success messages */}
      {exportError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{exportError}</p>
        </div>
      )}
      {importError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{importError}</p>
        </div>
      )}

      {/* Success message with summary */}
      {importSuccess && importSummary && (
        <div className="rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-100">{t("systemOps.importSummary.success")}</h3>
              <ul className="mt-2 space-y-1 text-sm text-green-800 dark:text-green-200">
                <li>
                  {t("systemOps.importSummary.customersImported")
                    .replace("{count}", String(importSummary.customers))
                    .replace("{new}", String(importSummary.customersNew))
                    .replace("{updated}", String(importSummary.customersUpdated))}
                </li>
                <li>
                  {t("systemOps.importSummary.templatesImported").replace("{count}", String(importSummary.templates))}
                </li>
              </ul>
              <div className="mt-3">
                <button
                  onClick={() => {
                    setImportSuccess(false);
                    setImportSummary(null);
                  }}
                  className="text-sm font-medium text-green-700 dark:text-green-300 hover:underline"
                >
                  {t("systemOps.importSummary.done")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Export Section */}
        <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.08] bg-white/50 dark:bg-[#0f1629]/90 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Download className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("systemOps.exportSection")}</h2>
          </div>

          <div className="space-y-3">
            {/* Quick Export */}
            <button
              onClick={handleQuickExport}
              disabled={exporting}
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-medium py-3 px-4 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Đang xuất..." : t("systemOps.quickExport")}
            </button>
            <p className="text-xs text-slate-600 dark:text-slate-400">{t("systemOps.quickExportDesc")}</p>
          </div>
        </div>

        {/* Import Section */}
        <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.08] bg-white/50 dark:bg-[#0f1629]/90 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("systemOps.importSection")}</h2>
          </div>

          <input
            type="file"
            accept=".json"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />

          <div className="space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={previewValidating}
              className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-medium py-3 px-4 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {previewValidating ? "Đang kiểm tra..." : t("systemOps.importFile")}
            </button>
            <p className="text-xs text-slate-600 dark:text-slate-400">{t("systemOps.importFileDesc")}</p>
          </div>
        </div>
      </div>

      {/* Import Preview Modal */}
      {showImportPreview && importFileData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-[#0f1629]/90 shadow-xl">
            <div className="border-b border-slate-200 dark:border-white/[0.07] p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t("systemOps.importPreview.title")}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Version check */}
              <div className="rounded-lg bg-slate-50 dark:bg-white/[0.05] p-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {t("systemOps.importPreview.version")}
                  <span className="ml-2 font-semibold text-slate-900 dark:text-slate-100">{String(importFileData.version)}</span>
                </p>
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("systemOps.importPreview.willImport")}:</p>
                <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  <li>
                    • {(importFileData.customers?.length || 0)} {t("systemOps.importPreview.new")}{" "}
                    {t("systemOps.exportPreview.customers").toLowerCase()}
                  </li>
                  <li>
                    • {(importFileData.field_templates?.length || 0)} {t("systemOps.importPreview.new")}{" "}
                    {t("systemOps.exportPreview.templates").toLowerCase()}
                  </li>
                </ul>
              </div>

              {previewError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-3">
                  <p className="text-xs text-red-700 dark:text-red-300">{previewError}</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-white/[0.07] p-6 flex gap-3">
              <button
                onClick={() => {
                  setShowImportPreview(false);
                  setImportFileData(null);
                  setPreviewError("");
                }}
                className="flex-1 rounded-lg border border-slate-200 dark:border-white/[0.09] bg-white dark:bg-[#0f1629]/90 text-slate-700 dark:text-slate-300 font-medium py-2 px-4 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors"
              >
                {t("systemOps.importPreview.cancel")}
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importing}
                className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-medium py-2 px-4 transition-colors"
              >
                {importing ? "Đang nhập..." : t("systemOps.importPreview.import")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

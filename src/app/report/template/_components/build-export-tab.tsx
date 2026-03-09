"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, Eye, Download, RotateCcw } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { OnlyOfficeEditorModal } from "@/components/onlyoffice-editor-modal";
import { useMappingDataStore } from "@/app/report/mapping/stores/use-mapping-data-store";
import { getSignedFileUrl } from "@/lib/report/signed-file-url";

type TemplateProfile = { id: string; template_name: string; docx_path: string; active: boolean };

type RunLog = {
  run_id: string;
  mapping_version_id: string;
  template_profile_id: string;
  result_summary: Record<string, unknown>;
  output_paths: string[];
  duration_ms: number;
  created_at: string;
};

type FreshnessPayload = {
  is_stale: boolean;
  reasons: string[];
  has_flat_draft: boolean;
  current_mapping_source_mode: "instance" | "legacy";
  current_mapping_source_id: string;
  current_mapping_updated_at: string;
  last_build_at?: string;
};

type ExportResponse = { ok: boolean; error?: string; output_path: string; auto_build_triggered?: boolean; stale_reasons?: string[]; details?: string };

type BuildExportTabProps = {
  templates: TemplateProfile[];
  activeTemplateId: string;
  onMessage: (msg: string) => void;
  onError: (err: string) => void;
};

/** Flush Zustand draft (including repeater arrays) to server before build/export. */
async function flushZustandDraft(): Promise<void> {
  const md = useMappingDataStore.getState();
  const repeaterData: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(md.values)) {
    if (Array.isArray(val)) repeaterData[key] = val;
  }
  const hasData = Object.keys(md.manualValues).length > 0 || Object.keys(repeaterData).length > 0;
  if (hasData) {
    await fetch("/api/report/values", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manual_values: { ...md.manualValues, ...repeaterData }, field_formulas: md.formulas }),
    });
  }
}

export function BuildExportTab({ templates, activeTemplateId, onMessage, onError }: BuildExportTabProps) {
  const { t } = useLanguage();
  const [runs, setRuns] = useState<RunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningBuild, setRunningBuild] = useState(false);
  const [runningExport, setRunningExport] = useState(false);
  const [buildResult, setBuildResult] = useState<unknown>(null);
  const [freshness, setFreshness] = useState<FreshnessPayload | null>(null);
  const [onlyOfficePreviewPath, setOnlyOfficePreviewPath] = useState("");
  const [previewClosed, setPreviewClosed] = useState(false);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/report/runs", { cache: "no-store" });
      const data = (await res.json()) as { ok: boolean; error?: string; run_logs?: RunLog[] };
      if (!data.ok) { onError(data.error ?? t("runs.err.load")); return; }
      setRuns(data.run_logs ?? []);
    } catch { onError(t("runs.err.load")); }
    finally { setLoading(false); }
  }, [t, onError]);

  const loadFreshness = useCallback(async () => {
    try {
      const res = await fetch("/api/report/freshness", { cache: "no-store" });
      const data = (await res.json()) as { ok: boolean; freshness?: FreshnessPayload };
      if (data.ok && data.freshness) setFreshness(data.freshness);
    } catch { /* best-effort, freshness is non-critical */ }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadRuns(); void loadFreshness(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadFreshness, loadRuns]);

  async function runBuildValidate() {
    setRunningBuild(true);
    onMessage(""); onError("");
    try { await flushZustandDraft(); } catch { /* best-effort */ }
    const res = await fetch("/api/report/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ run_build: true }) });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) { onError(data.error ?? t("runs.err.build")); }
    else { setBuildResult(data); onMessage(t("runs.msg.buildDone")); await loadRuns(); await loadFreshness(); }
    setRunningBuild(false);
  }

  async function runExportPreview() {
    setRunningExport(true);
    onMessage(""); onError("");
    try {
      try { await flushZustandDraft(); } catch { /* best-effort */ }
      const output = `report_assets/generated/report_preview_${Date.now()}.docx`;
      const report = `report_assets/generated/template_export_report_${Date.now()}.json`;
      const selectedTemplate = templates.find((tp) => tp.id === activeTemplateId);
      const exportBody: Record<string, string> = { output_path: output, report_path: report };
      if (selectedTemplate) exportBody.template_path = selectedTemplate.docx_path;
      const res = await fetch("/api/report/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(exportBody) });
      if (!res.ok) { const text = await res.text(); throw new Error(`Server error ${res.status}: ${text.slice(0, 200)}`); }
      const data = (await res.json()) as ExportResponse;
      if (!data.ok) throw new Error(data.details || data.error || t("runs.err.export"));
      setOnlyOfficePreviewPath(data.output_path);
      setPreviewClosed(false);
      onMessage(data.auto_build_triggered
        ? `Đã tự động chạy Build trước khi export${data.stale_reasons?.length ? ` (${data.stale_reasons.join(", ")})` : ""}.`
        : "Đã tạo báo cáo thành công. Mở OnlyOffice để xem chi tiết.");
      await loadRuns(); await loadFreshness();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Đã có lỗi xảy ra khi tạo báo cáo.");
    } finally { setRunningExport(false); }
  }

  async function handleDownloadDocx() {
    if (!onlyOfficePreviewPath) return;
    try { const url = await getSignedFileUrl(onlyOfficePreviewPath, true); window.open(url, "_blank"); }
    catch { onError("Failed to generate download URL."); }
  }

  return (
    <>
      {/* OnlyOffice preview modal (self-contained) */}
      {onlyOfficePreviewPath && !previewClosed && (
        <OnlyOfficeEditorModal docxPath={onlyOfficePreviewPath}
          onClose={() => setPreviewClosed(true)}
          onSaved={() => { void loadRuns(); void loadFreshness(); }} />
      )}

      {/* Freshness status */}
      {freshness?.is_stale ? (
        <div className="rounded-xl border border-amber-300/70 bg-amber-50/80 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="font-medium">Dữ liệu build có thể cũ so với Mapping hiện tại.</p>
          <p className="mt-1 text-xs">
            Lý do: {freshness.reasons.join(", ")}
            {freshness.last_build_at ? ` | Build gần nhất: ${new Date(freshness.last_build_at).toLocaleString("vi-VN")}` : ""}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-300/70 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-200">
          Dữ liệu build đang đồng bộ với Mapping hiện tại.
        </div>
      )}

      {/* Action toolbar */}
      <div className="flex flex-wrap gap-3">
        <button onClick={runBuildValidate} disabled={runningBuild}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-4 py-2 text-sm font-medium shadow-sm transition-all duration-150 hover:border-violet-200 dark:hover:border-violet-500/20 disabled:opacity-60">
          <Play className="h-4 w-4" />
          {runningBuild ? t("runs.running") : "Chạy Build Dữ Liệu"}
        </button>
        <button onClick={runExportPreview} disabled={runningExport || runningBuild}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 transition-all duration-200 hover:shadow-md hover:shadow-violet-500/30 hover:brightness-110 disabled:opacity-60">
          <Eye className="h-4 w-4" />
          {runningExport ? "Đang tạo báo cáo..." : "Tạo & Xem Báo Cáo trong OnlyOffice"}
        </button>
        {onlyOfficePreviewPath && (
          <button onClick={handleDownloadDocx}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-4 py-2 text-sm font-medium shadow-sm transition-all duration-150 hover:border-violet-200 dark:hover:border-violet-500/20">
            <Download className="h-4 w-4" /> Tải về DOCX
          </button>
        )}
        {onlyOfficePreviewPath && previewClosed && (
          <button onClick={() => setPreviewClosed(false)}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-4 py-2 text-sm font-medium shadow-sm transition-all duration-150 hover:border-violet-200 dark:hover:border-violet-500/20">
            <RotateCcw className="h-4 w-4" /> Mở lại trong OnlyOffice
          </button>
        )}
      </div>
      <p className="text-xs text-zinc-500 dark:text-slate-400">Nếu thiếu dữ liệu build, hệ thống sẽ tự chạy Build trước khi export.</p>

      {/* Build result */}
      {buildResult && (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4 shadow-sm">
          <h3 className="text-sm font-semibold">{t("runs.buildResult")}</h3>
          <pre className="mt-2 h-56 overflow-auto rounded-xl bg-zinc-900 dark:bg-zinc-950 p-3 text-xs text-zinc-200">
            {JSON.stringify(buildResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Run logs */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4 shadow-sm">
        <h3 className="text-sm font-semibold">{t("runs.logs")}</h3>
        {loading && (
          <div className="mt-3 flex items-center justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600 dark:border-violet-800 dark:border-t-violet-400" />
          </div>
        )}
        <ul className="mt-2 space-y-2">
          {runs.map((run) => (
            <li key={run.run_id} className="rounded-xl border border-zinc-200 dark:border-white/[0.07] p-3 text-sm transition-colors duration-150 hover:border-violet-200 dark:hover:border-violet-500/20">
              <p className="font-medium">{run.run_id}</p>
              <p className="text-xs text-zinc-500 dark:text-slate-400">
                {t("runs.meta.mapping")}: {run.mapping_version_id} | {t("runs.meta.template")}: {run.template_profile_id}
              </p>
              <p className="text-xs text-zinc-400 dark:text-slate-500">
                {new Date(run.created_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })} | {run.duration_ms} ms
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {run.output_paths.map((p) => (
                  <button key={p}
                    onClick={async () => { try { const url = await getSignedFileUrl(p, true); window.open(url, "_blank"); } catch { onError("Failed to download file."); } }}
                    className="inline-flex items-center gap-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 px-2 py-1 text-[11px] font-mono text-violet-800 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
                    title="Tải về">
                    <Download className="h-3 w-3" /> {p.split("/").pop()}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

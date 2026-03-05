"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, Eye, Download } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { OnlyOfficeEditorModal } from "@/components/onlyoffice-editor-modal";
import { useMappingDataStore } from "@/app/report/mapping/stores/use-mapping-data-store";
import { getSignedFileUrl } from "@/lib/report/signed-file-url";

type RunLog = {
  run_id: string;
  mapping_version_id: string;
  template_profile_id: string;
  result_summary: Record<string, unknown>;
  output_paths: string[];
  duration_ms: number;
  created_at: string;
};

type RunsResponse = {
  ok: boolean;
  error?: string;
  run_logs?: RunLog[];
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

type ExportResponse = {
  ok: boolean;
  error?: string;
  output_path: string;
  auto_build_triggered?: boolean;
  stale_reasons?: string[];
};

/** Flush Zustand draft (including repeater arrays) to the server before build/export. */
async function flushZustandDraft(): Promise<void> {
  const md = useMappingDataStore.getState();
  const repeaterData: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(md.values)) {
    if (Array.isArray(val)) repeaterData[key] = val;
  }
  const hasData =
    Object.keys(md.manualValues).length > 0 || Object.keys(repeaterData).length > 0;
  if (hasData) {
    await fetch("/api/report/values", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manual_values: { ...md.manualValues, ...repeaterData },
        field_formulas: md.formulas,
      }),
    });
  }
}

export default function RunsPage() {
  const { t } = useLanguage();
  const [runs, setRuns] = useState<RunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningBuild, setRunningBuild] = useState(false);
  const [runningExport, setRunningExport] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [buildResult, setBuildResult] = useState<unknown>(null);
  const [freshness, setFreshness] = useState<FreshnessPayload | null>(null);

  // OnlyOffice Preview states
  const [onlyOfficePreviewPath, setOnlyOfficePreviewPath] = useState<string>("");

  const loadRuns = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/report/runs", { cache: "no-store" });
    const data = (await res.json()) as RunsResponse;
    if (!data.ok) {
      setError(data.error ?? t("runs.err.load"));
      setLoading(false);
      return;
    }
    setRuns(data.run_logs ?? []);
    setLoading(false);
  }, [t]);

  const loadFreshness = useCallback(async () => {
    const res = await fetch("/api/report/freshness", { cache: "no-store" });
    const data = (await res.json()) as { ok: boolean; error?: string; freshness?: FreshnessPayload };
    if (!data.ok || !data.freshness) {
      return;
    }
    setFreshness(data.freshness);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRuns();
      void loadFreshness();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadFreshness, loadRuns]);

  async function runBuildValidate() {
    setRunningBuild(true);
    setMessage("");
    setError("");

    // Flush Zustand draft (repeater arrays) to server before build
    try { await flushZustandDraft(); } catch { /* best-effort */ }

    const res = await fetch("/api/report/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_build: true }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      setError(data.error ?? t("runs.err.build"));
    } else {
      setBuildResult(data);
      setMessage(t("runs.msg.buildDone"));
      await loadRuns();
      await loadFreshness();
    }
    setRunningBuild(false);
  }

  async function runExportPreview() {
    setRunningExport(true);
    setMessage("");
    setError("");
    try {
      // Flush Zustand draft (repeater arrays) to server before export
      try { await flushZustandDraft(); } catch { /* best-effort */ }

      const output = `report_assets/report_preview_${Date.now()}.docx`;
      const report = `report_assets/template_export_report_${Date.now()}.json`;

      const res = await fetch("/api/report/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          output_path: output,
          report_path: report,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`[Runs] HTTP ${res.status}:`, text);
        throw new Error(`Server error ${res.status}: ${text.slice(0, 200)}`);
      }

      const data = (await res.json()) as ExportResponse & { details?: string };
      if (!data.ok) {
        const errorMsg = data.details || data.error || t("runs.err.export");
        console.error("[Runs] Export error:", data);
        throw new Error(errorMsg);
      }

      const filePath = data.output_path;
      setOnlyOfficePreviewPath(filePath);
      setMessage(
        data.auto_build_triggered
          ? `Đã tự động chạy Build trước khi export${data.stale_reasons?.length ? ` (${data.stale_reasons.join(", ")})` : ""}.`
          : "Đã tạo báo cáo thành công. Mở OnlyOffice để xem chi tiết.",
      );
      await loadRuns();
      await loadFreshness();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra khi tạo báo cáo.");
    } finally {
      setRunningExport(false);
    }
  }

  async function handleDownloadDocx() {
    if (!onlyOfficePreviewPath) return;
    try {
      const url = await getSignedFileUrl(onlyOfficePreviewPath, true);
      window.open(url, "_blank");
    } catch {
      setError("Failed to generate download URL.");
    }
  }

  return (
    <section className="space-y-4">
      {onlyOfficePreviewPath && (
        <OnlyOfficeEditorModal
          docxPath={onlyOfficePreviewPath}
          onClose={() => setOnlyOfficePreviewPath("")}
          onSaved={() => {
            // Refresh runs list if user saves changes in OnlyOffice
            void loadRuns();
            void loadFreshness();
          }}
        />
      )}

      <div className="rounded-xl border border-blue-chill-200 bg-white dark:bg-[#141414]/90 p-4">
        <h2 className="text-lg font-semibold">{t("runs.title")}</h2>
        <p className="mt-1 text-sm text-blue-chill-600">{t("runs.desc")}</p>
        {freshness?.is_stale ? (
          <div className="mt-2 rounded-xl border border-amber-300/70 bg-amber-50/80 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="font-medium">Dữ liệu build có thể cũ so với Mapping hiện tại.</p>
            <p className="mt-1 text-xs">
              Lý do: {freshness.reasons.join(", ")}
              {freshness.last_build_at ? ` | Build gần nhất: ${new Date(freshness.last_build_at).toLocaleString("vi-VN")}` : ""}
            </p>
          </div>
        ) : (
          <div className="mt-2 rounded-xl border border-emerald-300/70 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-200">
            Dữ liệu build đang đồng bộ với Mapping hiện tại.
          </div>
        )}
        {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={runBuildValidate}
          disabled={runningBuild}
          className="flex items-center gap-2 rounded-md border border-slate-300 bg-white dark:bg-[#141414]/90 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] disabled:opacity-60 transition-colors"
        >
          <Play className="h-4 w-4" />
          {runningBuild ? t("runs.running") : "Chạy Build Dữ Liệu"}
        </button>
        <button
          onClick={runExportPreview}
          disabled={runningExport || runningBuild}
          className="flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
        >
          <Eye className="h-4 w-4" />
          {runningExport ? "Đang tạo báo cáo..." : "Tạo & Xem Báo Cáo trong OnlyOffice"}
        </button>
        {onlyOfficePreviewPath && (
          <button
            onClick={handleDownloadDocx}
            className="flex items-center gap-2 rounded-md border border-slate-300 bg-white dark:bg-[#141414]/90 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors"
          >
            <Download className="h-4 w-4" />
            Tải về DOCX
          </button>
        )}
      </div>
      <p className="text-xs text-blue-chill-600 dark:text-blue-chill-300">
        Nếu thiếu dữ liệu build, hệ thống sẽ tự chạy Build trước khi export.
      </p>

      {buildResult ? (
        <div className="rounded-xl border border-blue-chill-200 bg-white dark:bg-[#141414]/90 p-4">
          <h3 className="text-sm font-semibold">{t("runs.buildResult")}</h3>
          <pre className="mt-2 h-56 overflow-auto rounded bg-blue-chill-950 p-3 text-xs text-blue-chill-50">
            {JSON.stringify(buildResult, null, 2)}
          </pre>
        </div>
      ) : null}

      <div className="rounded-xl border border-blue-chill-200 bg-white dark:bg-[#141414]/90 p-4">
        <h3 className="text-sm font-semibold">{t("runs.logs")}</h3>
        {loading ? <p className="mt-2 text-sm text-blue-chill-600">{t("runs.loadingLogs")}</p> : null}
        <ul className="mt-2 space-y-2">
          {runs.map((run) => (
            <li key={run.run_id} className="rounded border border-blue-chill-200 p-3 text-sm">
              <p className="font-medium">{run.run_id}</p>
              <p className="text-xs text-blue-chill-600">
                {t("runs.meta.mapping")}: {run.mapping_version_id} | {t("runs.meta.template")}: {run.template_profile_id}
              </p>
              <p className="text-xs text-blue-chill-500">
                {new Date(run.created_at).toLocaleString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                })}{" "}
                | {run.duration_ms} ms
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {run.output_paths.map((p) => (
                  <span key={p} className="rounded bg-blue-chill-50 px-2 py-1 text-[11px] font-mono text-blue-chill-800">
                    {p}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

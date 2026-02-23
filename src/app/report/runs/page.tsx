"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, Eye, Download } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { DocxPreviewModal } from "@/components/docx-preview-modal";

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

export default function RunsPage() {
  const { t } = useLanguage();
  const [runs, setRuns] = useState<RunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningBuild, setRunningBuild] = useState(false);
  const [runningExport, setRunningExport] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [buildResult, setBuildResult] = useState<unknown>(null);
  
  // Preview Modal states
  const [previewBuffer, setPreviewBuffer] = useState<ArrayBuffer | null>(null);
  const [previewFilePath, setPreviewFilePath] = useState<string>("");

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRuns();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRuns]);

  async function runBuildValidate() {
    setRunningBuild(true);
    setMessage("");
    setError("");
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
    }
    setRunningBuild(false);
  }

  async function runExportPreview() {
    setRunningExport(true);
    setMessage("");
    setError("");
    try {
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
      
      const data = (await res.json()) as { ok: boolean; error?: string; output_path: string };
      if (!data.ok) {
        throw new Error(data.error ?? t("runs.err.export"));
      }
      
      const filePath = data.output_path;
      
      // Fetch the generated DOCX for preview
      const fileRes = await fetch(`/api/report/file?path=${encodeURIComponent(filePath)}&download=0&ts=${Date.now()}`);
      if (!fileRes.ok) {
        throw new Error("Không thể tải file preview từ máy chủ.");
      }
      
      const buffer = await fileRes.arrayBuffer();
      setPreviewFilePath(filePath);
      setPreviewBuffer(buffer);
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra khi tạo preview.");
    } finally {
      setRunningExport(false);
    }
  }

  function handleDownloadDocx() {
    if (!previewFilePath) return;
    const url = `/api/report/file?path=${encodeURIComponent(previewFilePath)}&download=1`;
    window.open(url, "_blank");
  }

  return (
    <section className="space-y-4">
      {previewBuffer && (
        <DocxPreviewModal
          documentBuffer={previewBuffer}
          fileName={previewFilePath.split('/').pop() || "Preview"}
          onClose={() => setPreviewBuffer(null)}
          onDownload={handleDownloadDocx}
        />
      )}

      <div className="rounded-xl border border-blue-chill-200 bg-white p-4">
        <h2 className="text-lg font-semibold">{t("runs.title")}</h2>
        <p className="mt-1 text-sm text-blue-chill-600">{t("runs.desc")}</p>
        {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="flex gap-3">
        <button
          onClick={runBuildValidate}
          disabled={runningBuild}
          className="flex items-center gap-2 rounded-md border border-blue-chill-300 bg-white px-4 py-2 text-sm font-medium text-blue-chill-800 hover:bg-blue-chill-50 disabled:opacity-60 transition-colors"
        >
          <Play className="h-4 w-4" />
          {runningBuild ? t("runs.running") : "Chạy Build dữ liệu (Background)"}
        </button>
        <button
          onClick={runExportPreview}
          disabled={runningExport}
          className="flex items-center gap-2 rounded-md bg-blue-chill-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-chill-800 disabled:opacity-60 transition-colors shadow-sm"
        >
          <Eye className="h-4 w-4" />
          {runningExport ? "Đang chuẩn bị bản xem trước..." : "Tạo & Xem trước Báo Cáo"}
        </button>
      </div>

      {buildResult ? (
        <div className="rounded-xl border border-blue-chill-200 bg-white p-4">
          <h3 className="text-sm font-semibold">{t("runs.buildResult")}</h3>
          <pre className="mt-2 h-56 overflow-auto rounded bg-blue-chill-950 p-3 text-xs text-blue-chill-50">
            {JSON.stringify(buildResult, null, 2)}
          </pre>
        </div>
      ) : null}

      <div className="rounded-xl border border-blue-chill-200 bg-white p-4">
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
                {new Date(run.created_at).toLocaleString()} | {run.duration_ms} ms
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

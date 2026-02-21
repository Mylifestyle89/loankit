"use client";

import { useCallback, useEffect, useState } from "react";

import { useLanguage } from "@/components/language-provider";

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
  const [exportResult, setExportResult] = useState<unknown>(null);

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
    const res = await fetch("/api/report/build", { method: "POST" });
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
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      setError(data.error ?? t("runs.err.export"));
    } else {
      setExportResult(data);
      setMessage(t("runs.msg.exportDone"));
      await loadRuns();
    }
    setRunningExport(false);
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-coral-tree-200 bg-white p-4">
        <h2 className="text-lg font-semibold">{t("runs.title")}</h2>
        <p className="mt-1 text-sm text-coral-tree-600">{t("runs.desc")}</p>
        {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="flex gap-3">
        <button
          onClick={runBuildValidate}
          disabled={runningBuild}
          className="rounded-md bg-coral-tree-700 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {runningBuild ? t("runs.running") : t("runs.runBuild")}
        </button>
        <button
          onClick={runExportPreview}
          disabled={runningExport}
          className="rounded-md border border-coral-tree-300 px-4 py-2 text-sm disabled:opacity-60"
        >
          {runningExport ? t("runs.exporting") : t("runs.runExport")}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-coral-tree-200 bg-white p-4">
          <h3 className="text-sm font-semibold">{t("runs.buildResult")}</h3>
          <pre className="mt-2 h-56 overflow-auto rounded bg-coral-tree-950 p-3 text-xs text-coral-tree-50">
            {JSON.stringify(buildResult, null, 2)}
          </pre>
        </div>
        <div className="rounded-xl border border-coral-tree-200 bg-white p-4">
          <h3 className="text-sm font-semibold">{t("runs.exportResult")}</h3>
          <pre className="mt-2 h-56 overflow-auto rounded bg-coral-tree-950 p-3 text-xs text-coral-tree-50">
            {JSON.stringify(exportResult, null, 2)}
          </pre>
        </div>
      </div>

      <div className="rounded-xl border border-coral-tree-200 bg-white p-4">
        <h3 className="text-sm font-semibold">{t("runs.logs")}</h3>
        {loading ? <p className="mt-2 text-sm text-coral-tree-600">{t("runs.loadingLogs")}</p> : null}
        <ul className="mt-2 space-y-2">
          {runs.map((run) => (
            <li key={run.run_id} className="rounded border border-coral-tree-200 p-3 text-sm">
              <p className="font-medium">{run.run_id}</p>
              <p className="text-xs text-coral-tree-600">
                {t("runs.meta.mapping")}: {run.mapping_version_id} | {t("runs.meta.template")}: {run.template_profile_id}
              </p>
              <p className="text-xs text-coral-tree-500">
                {new Date(run.created_at).toLocaleString()} | {run.duration_ms} ms
              </p>
              <p className="mt-1 text-xs text-coral-tree-600">{run.output_paths.join(", ")}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

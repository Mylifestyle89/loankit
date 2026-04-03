"use client";

// Batch job list — progress bar, system log, output file cards for completed batch jobs

import { type RefObject } from "react";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { SystemLogCard, type SystemLogEntry } from "../system-log-card";
import { getSignedFileUrl } from "@/lib/report/signed-file-url";
import type { AutoProcessJob } from "../../types";

type BatchJobListProps = {
  autoProcessJob: AutoProcessJob | null;
  liveLogs: SystemLogEntry[];
  liveLogEndRef: RefObject<HTMLDivElement | null>;
  t: (key: string) => string;
};

export function BatchJobList({ autoProcessJob, liveLogs, liveLogEndRef, t }: BatchJobListProps) {
  if (!autoProcessJob) return null;

  return (
    <div className="mt-3 space-y-3">
      {/* Progress bar */}
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
      {autoProcessJob.phase === "completed" && autoProcessJob.output_paths.length > 0 && (
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
      )}
    </div>
  );
}

"use client";

// Tagging tab for AiMappingModal — AI auto-tagging of Word documents with placeholder tags

import { motion } from "framer-motion";
import { Upload, Tags, FileText, Download, ArrowRight } from "lucide-react";
import type { useAutoTagging } from "../../hooks/useAutoTagging";

type TaggingTabProps = {
  headersRaw: string;
  setHeadersRaw: (v: string) => void;
  tagging: ReturnType<typeof useAutoTagging>;
  t: (key: string) => string;
};

export function TaggingTab({ headersRaw, setHeadersRaw, tagging, t }: TaggingTabProps) {
  return (
    <div className="space-y-4 px-4 py-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">{t("autoTagging.desc")}</p>

      {/* Upload Word file */}
      <div className="space-y-1.5">
        <span className="block text-xs font-medium text-slate-700 dark:text-slate-200">
          {t("autoTagging.uploadLabel")}
        </span>
        <div className="rounded-lg border-2 border-dashed border-brand-300/80 bg-white/60 px-3 py-3 transition-colors hover:border-brand-400 dark:border-brand-500/30 dark:bg-white/[0.04]">
          <label className="flex cursor-pointer items-center gap-2">
            <Upload className="h-4 w-4 flex-shrink-0 text-brand-500" />
            <span className="text-xs font-medium text-brand-500">{t("autoTagging.chooseFile")}</span>
            <input
              type="file"
              accept=".docx,.doc"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = "";
                tagging.setFile(f);
              }}
            />
          </label>
          {tagging.file ? (
            <p className="mt-1.5 truncate text-xs text-emerald-700">{tagging.file.name}</p>
          ) : (
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{t("autoTagging.noFile")}</p>
          )}
        </div>
      </div>

      {/* Headers input — reuses headersRaw shared with Suggest tab */}
      <div className="space-y-1.5">
        <span className="block text-xs font-medium text-slate-700 dark:text-slate-200">
          {t("autoTagging.headersLabel")}
        </span>
        <textarea
          value={headersRaw}
          onChange={(e) => setHeadersRaw(e.target.value)}
          rows={4}
          placeholder={t("autoTagging.headersPlaceholder")}
          className="w-full rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      {/* Format picker */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
          {t("autoTagging.formatLabel")}:
        </span>
        <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
          <input
            type="radio"
            name="tag-format"
            checked={tagging.format === "square"}
            onChange={() => tagging.setFormat("square")}
            className="h-3.5 w-3.5 border-slate-300 text-brand-500 focus:ring-brand-500"
          />
          {t("autoTagging.formatSquare")}
        </label>
        <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
          <input
            type="radio"
            name="tag-format"
            checked={tagging.format === "curly"}
            onChange={() => tagging.setFormat("curly")}
            className="h-3.5 w-3.5 border-slate-300 text-brand-500 focus:ring-brand-500"
          />
          {t("autoTagging.formatCurly")}
        </label>
      </div>

      {/* Analyze button */}
      <button
        type="button"
        onClick={() => void tagging.analyzeDocument(headersRaw)}
        disabled={tagging.analyzing}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:brightness-110 disabled:opacity-70"
      >
        <Tags className="h-4 w-4" />
        {tagging.analyzing ? t("autoTagging.analyzing") : t("autoTagging.analyze")}
      </button>

      {tagging.error ? <p className="text-sm text-rose-600">{tagging.error}</p> : null}

      {/* Suggestions preview */}
      {tagging.suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {t("autoTagging.previewTitle").replace("{count}", String(tagging.suggestions.length))}
            </h5>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => tagging.toggleAll(true)}
                className="text-[11px] font-medium text-brand-500 hover:underline dark:text-brand-400"
              >
                {t("autoTagging.selectAll")}
              </button>
              <button
                type="button"
                onClick={() => tagging.toggleAll(false)}
                className="text-[11px] font-medium text-slate-500 hover:underline dark:text-slate-400"
              >
                {t("autoTagging.deselectAll")}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {tagging.suggestions.map((sg, idx) => {
              const fallbackTag =
                tagging.format === "curly"
                  ? `{{${sg.sourceHeader ?? ""}}}`
                  : `[${sg.sourceHeader ?? ""}]`;
              const tag = sg.proposedTag || fallbackTag;
              const confLabel =
                sg.confidenceScore >= 0.8
                  ? t("autoTagging.confidenceHigh")
                  : sg.confidenceScore >= 0.5
                    ? t("autoTagging.confidenceMid")
                    : t("autoTagging.confidenceLow");
              const confColor =
                sg.confidenceScore >= 0.8
                  ? "bg-emerald-100 text-emerald-700"
                  : sg.confidenceScore >= 0.5
                    ? "bg-brand-100 text-brand-600"
                    : "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300";

              return (
                <motion.label
                  key={`${sg.proposedTag}-${sg.paragraphIndex}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                    tagging.accepted[idx]
                      ? "border-brand-200/80 bg-brand-50/40 shadow-sm dark:border-brand-500/30 dark:bg-brand-500/10"
                      : "border-slate-200/60 bg-white/30 dark:border-white/[0.07] dark:bg-white/[0.04]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={tagging.accepted[idx] ?? false}
                    onChange={() => tagging.toggleSuggestion(idx)}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="truncate rounded-md bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-400"
                        title={sg.originalText}
                      >
                        &ldquo;{sg.originalText.length > 50 ? sg.originalText.slice(0, 50) + "..." : sg.originalText}&rdquo;
                      </span>
                      <ArrowRight className="h-3 w-3 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="truncate rounded-md bg-brand-100 dark:bg-brand-500/10 px-2 py-0.5 text-xs font-mono font-medium text-brand-600 dark:text-brand-400">
                        {tag}
                      </span>
                    </div>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${confColor}`}>
                      {confLabel}
                    </span>
                  </div>
                </motion.label>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/50 pt-3 dark:border-white/[0.07]">
            <button
              type="button"
              onClick={() => void tagging.applyTags()}
              disabled={tagging.applying || tagging.accepted.every((a) => !a)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-60"
            >
              <FileText className="h-4 w-4" />
              {tagging.applying ? t("autoTagging.creating") : t("autoTagging.createTemplate")}
            </button>

            {tagging.resultUrl && (
              <a
                href={tagging.resultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                <Download className="h-4 w-4" />
                {t("autoTagging.downloadTemplate")}
              </a>
            )}
          </div>

          {tagging.resultUrl && (
            <p className="text-xs font-medium text-emerald-600">{t("autoTagging.resultReady")}</p>
          )}
        </div>
      )}
    </div>
  );
}

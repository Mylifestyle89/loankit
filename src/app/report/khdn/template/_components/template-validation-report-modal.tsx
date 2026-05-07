"use client";

import { useEffect, useState } from "react";

import type { ValidationReport } from "./use-template-upload-validation";

type Props = {
  report: ValidationReport;
  fileName: string;
  onSave: (savePath: string) => Promise<void>;
  onClose: () => void;
};

export function TemplateValidationReportModal({ report, fileName, onSave, onClose }: Props) {
  const [savePath, setSavePath] = useState(`report_assets/${fileName}`);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["valid", "unknown", "missing"]),
  );

  function toggleSection(key: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // [H3] Escape key to close
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSave() {
    // [H1] Validate save path prefix
    if (!savePath.startsWith("report_assets/")) {
      setError("Đường dẫn phải bắt đầu bằng report_assets/");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(savePath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi lưu file.");
    } finally {
      setSaving(false);
    }
  }

  const allValid = report.unknown.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Kết quả kiểm tra template" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mx-4 w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#161616] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/[0.07] px-5 py-4">
          <div>
            <h3 className="text-base font-bold tracking-tight">Kết quả kiểm tra template</h3>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-slate-400 truncate max-w-md">{fileName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors" aria-label="Đóng">✕</button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 border-b border-zinc-100 dark:border-white/[0.07] px-5 py-3 text-sm">
          <StatBadge color="emerald" count={report.valid.length} label="Hợp lệ" />
          <StatBadge color="amber" count={report.unknown.length} label="Chưa rõ" />
          <StatBadge color="blue" count={report.missing.length} label="Thiếu" />
          <span className="ml-auto text-zinc-400 dark:text-slate-500 text-xs">
            {report.total_placeholders} placeholder · {report.total_catalog_fields} catalog fields
          </span>
        </div>

        {/* Success banner */}
        {allValid && (
          <div className="mx-5 mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            Tất cả placeholder đều hợp lệ!
          </div>
        )}

        {/* Sections */}
        <div className="max-h-[20rem] overflow-y-auto px-5 py-3 space-y-2">
          {/* Valid section */}
          {report.valid.length > 0 && (
            <CollapsibleSection
              title={`Hợp lệ (${report.valid.length})`}
              color="emerald"
              expanded={expandedSections.has("valid")}
              onToggle={() => toggleSection("valid")}
            >
              <table className="w-full text-sm">
                <tbody>
                  {report.valid.map((v) => (
                    <tr key={v.placeholder} className="border-b border-zinc-50 dark:border-white/[0.03]">
                      <td className="py-1 pr-3 font-mono text-xs text-emerald-700 dark:text-emerald-400">[{v.placeholder}]</td>
                      <td className="py-1 text-zinc-600 dark:text-slate-300">{v.label_vi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CollapsibleSection>
          )}

          {/* Unknown section */}
          {report.unknown.length > 0 && (
            <CollapsibleSection
              title={`Chưa rõ (${report.unknown.length})`}
              color="amber"
              expanded={expandedSections.has("unknown")}
              onToggle={() => toggleSection("unknown")}
            >
              <table className="w-full text-sm">
                <tbody>
                  {report.unknown.map((u) => (
                    <tr key={u.placeholder} className="border-b border-zinc-50 dark:border-white/[0.03]">
                      <td className="py-1 pr-3 font-mono text-xs text-primary-600 dark:text-primary-400">[{u.placeholder}]</td>
                      <td className="py-1">
                        {u.suggestions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.suggestions.map((s) => (
                              <SuggestionChip key={s} label={s} />
                            ))}
                          </div>
                        ) : (
                          <span className="text-zinc-400 dark:text-slate-500 text-xs">Không có gợi ý</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CollapsibleSection>
          )}

          {/* Missing section */}
          {report.missing.length > 0 && (
            <CollapsibleSection
              title={`Thiếu trong template (${report.missing.length})`}
              color="blue"
              expanded={expandedSections.has("missing")}
              onToggle={() => toggleSection("missing")}
            >
              <table className="w-full text-sm">
                <tbody>
                  {report.missing.map((m) => (
                    <tr key={m.field_key} className="border-b border-zinc-50 dark:border-white/[0.03]">
                      <td className="py-1 pr-3 font-mono text-xs text-blue-700 dark:text-blue-400">[{m.field_key}]</td>
                      <td className="py-1 text-zinc-600 dark:text-slate-300">{m.label_vi}</td>
                      <td className="py-1 text-xs text-zinc-400 dark:text-slate-500">{m.group}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CollapsibleSection>
          )}
        </div>

        {/* Footer: save path + actions */}
        <div className="border-t border-zinc-100 dark:border-white/[0.07] px-5 py-4 space-y-3">
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={savePath}
              onChange={(e) => setSavePath(e.target.value)}
              placeholder="report_assets/template.docx"
              className="flex-1 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
            />
            <button
              type="button" onClick={handleSave} disabled={saving || !savePath}
              className="rounded-lg bg-primary-500 px-5 py-2 text-sm font-medium text-white shadow-sm shadow-primary-500/25 hover:brightness-110 disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              type="button" onClick={onClose}
              className="rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-4 py-2 text-sm shadow-sm hover:border-primary-200 dark:hover:border-primary-500/20"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

type BadgeColor = "emerald" | "amber" | "blue";

function StatBadge({ color, count, label }: { color: BadgeColor; count: number; label: string }) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    amber: "bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorMap[color] ?? ""}`}>
      {count} {label}
    </span>
  );
}

function CollapsibleSection({ title, color, expanded, onToggle, children }: {
  title: string; color: BadgeColor; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  const borderMap: Record<string, string> = {
    emerald: "border-emerald-200 dark:border-emerald-500/20",
    amber: "border-primary-200 dark:border-primary-500/20",
    blue: "border-blue-200 dark:border-blue-500/20",
  };
  return (
    <div className={`rounded-lg border ${borderMap[color] ?? "border-zinc-200 dark:border-white/[0.07]"}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-zinc-50/60 dark:hover:bg-white/[0.03] transition-colors">
        <span className="text-xs text-zinc-400">{expanded ? "▼" : "▶"}</span>
        {title}
      </button>
      {expanded && <div className="px-3 pb-2">{children}</div>}
    </div>
  );
}

function SuggestionChip({ label }: { label: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    void navigator.clipboard.writeText(label).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      type="button" onClick={handleCopy}
      className="rounded-md bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-500/20 px-2 py-0.5 text-xs text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-800/40 transition-colors"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

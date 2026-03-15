"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, Check, Sparkles } from "lucide-react";

import { DocxPreviewModal } from "@/components/docx-preview-modal";
import { METHOD_OPTIONS } from "@/lib/loan-plan/loan-plan-constants";
import { KhcnPlaceholderPanel } from "./khcn-placeholder-panel";

type DocTemplate = { path: string; name: string };
type Category = { key: string; label: string; isAsset?: boolean; templates: DocTemplate[] };

const TABS = [
  { key: "docs", label: "Hồ sơ vay" },
  { key: "tsbd", label: "TSBĐ" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/**
 * KHCN document checklist — shows DOCX templates filtered by loan method.
 * Users can check off completed documents and download templates.
 */
type LoanOption = { id: string; contractNumber: string; loanAmount: number; status: string };

export function KhcnDocChecklist({
  loanMethod: initialMethod,
  customerId,
  loanId: initialLoanId,
}: {
  loanMethod?: string;
  customerId?: string;
  loanId?: string;
}) {
  const [method, setMethod] = useState(initialMethod ?? "tung_lan");
  const [tab, setTab] = useState<TabKey>("docs");

  // Active loan selection
  const [loans, setLoans] = useState<LoanOption[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState(initialLoanId ?? "");

  useEffect(() => {
    if (!customerId) return;
    fetch(`/api/customers/${customerId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const loanList: LoanOption[] = (d.customer?.loans ?? []).map((l: Record<string, unknown>) => ({
          id: l.id as string,
          contractNumber: l.contractNumber as string,
          loanAmount: l.loanAmount as number,
          status: l.status as string,
        }));
        setLoans(loanList);
        if (!selectedLoanId && loanList.length > 0) setSelectedLoanId(loanList[0].id);
      })
      .catch(() => {});
  }, [customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loanId = selectedLoanId || initialLoanId;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setChecked(new Set()); // Reset checked when method changes
    fetch(`/api/report/templates/khcn?loan_method=${method}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setCategories(d.categories ?? []);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setLoading(false);
      });
    return () => controller.abort();
  }, [method]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => (tab === "tsbd") === !!c.isAsset),
    [categories, tab],
  );
  const totalDocs = useMemo(() => filteredCategories.reduce((s, c) => s + c.templates.length, 0), [filteredCategories]);

  const toggleCheck = useCallback((path: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleDownload = useCallback((path: string) => {
    window.open(`/api/report/templates/open?path=${encodeURIComponent(path)}`, "_blank");
  }, []);

  const [generating, setGenerating] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ buffer: ArrayBuffer; filename: string } | null>(null);

  const handleGenerate = useCallback(async (path: string, name: string) => {
    if (!customerId) return;
    setGenerating(path);
    try {
      const res = await fetch("/api/report/templates/khcn/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, templatePath: path, templateLabel: name, loanId }),
      });
      if (!res.ok) { setGenerating(null); return; }
      const buffer = await res.arrayBuffer();
      const cd = res.headers.get("Content-Disposition");
      const filename = cd
        ? decodeURIComponent(cd.split("filename*=UTF-8''")[1] ?? name + ".docx")
        : name + ".docx";
      // Open preview modal instead of auto-download
      setPreview({ buffer, filename });
    } catch { /* ignore */ }
    setGenerating(null);
  }, [customerId, loanId]);

  const handlePreviewDownload = useCallback(() => {
    if (!preview) return;
    const blob = new Blob([preview.buffer], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = preview.filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [preview]);

  return (
    <div className="space-y-4">
      {/* Method selector + progress */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">Phương thức:</span>
          <div className="flex rounded-lg border border-zinc-200 dark:border-white/[0.09] overflow-hidden">
            {METHOD_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setMethod(o.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  method === o.value
                    ? "bg-violet-600 text-white"
                    : "bg-white dark:bg-[#1a1a1a] text-zinc-600 dark:text-zinc-400 hover:bg-violet-50 dark:hover:bg-violet-500/10"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-zinc-500">
          <span className="font-semibold text-violet-600">{checked.size}</span>/{totalDocs} hoàn thành
        </div>
      </div>

      {/* Active loan selector */}
      {loans.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">HĐTD:</span>
          <select
            value={selectedLoanId}
            onChange={(e) => setSelectedLoanId(e.target.value)}
            className="rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          >
            {loans.map((l) => (
              <option key={l.id} value={l.id}>
                {l.contractNumber} — {new Intl.NumberFormat("vi-VN").format(l.loanAmount)}đ
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Doc / TSBĐ tabs */}
      <div className="flex rounded-lg border border-zinc-200 dark:border-white/[0.09] overflow-hidden w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key
                ? "bg-violet-600 text-white"
                : "bg-white dark:bg-[#1a1a1a] text-zinc-600 dark:text-zinc-400 hover:bg-violet-50 dark:hover:bg-violet-500/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-white/[0.05] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
          style={{ width: totalDocs > 0 ? `${(checked.size / totalDocs) * 100}%` : "0%" }}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCategories.map((cat) => (
            <div key={cat.key} className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] overflow-hidden">
              <div className="px-4 py-2.5 bg-zinc-50 dark:bg-white/[0.03] border-b border-zinc-200 dark:border-white/[0.05]">
                <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">{cat.label}</h4>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
                {cat.templates.map((t) => {
                  const isChecked = checked.has(t.path);
                  return (
                    <div
                      key={t.path}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                        isChecked ? "bg-emerald-50/50 dark:bg-emerald-500/5" : "hover:bg-zinc-50 dark:hover:bg-white/[0.02]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCheck(t.path)}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          isChecked
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-zinc-300 dark:border-white/[0.15] hover:border-violet-400"
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3" />}
                      </button>
                      <FileText className="h-4 w-4 shrink-0 text-violet-400" />
                      <span className={`flex-1 text-sm ${isChecked ? "text-zinc-400 line-through" : ""}`}>{t.name}</span>
                      {customerId && (
                        <button
                          type="button"
                          onClick={() => handleGenerate(t.path, t.name)}
                          disabled={generating === t.path}
                          className="shrink-0 rounded-md p-1.5 text-fuchsia-500 hover:bg-fuchsia-50 hover:text-fuchsia-700 dark:hover:bg-fuchsia-500/10 transition-colors"
                          title="Tạo báo cáo"
                        >
                          {generating === t.path
                            ? <div className="h-3.5 w-3.5 animate-spin rounded-full border border-fuchsia-300 border-t-fuchsia-600" />
                            : <Sparkles className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDownload(t.path)}
                        className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10 transition-colors"
                        title="Tải mẫu gốc"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Placeholder reference panel */}
      <KhcnPlaceholderPanel />

      {/* Preview modal */}
      {preview && (
        <DocxPreviewModal
          documentBuffer={preview.buffer}
          fileName={preview.filename}
          onClose={() => setPreview(null)}
          onDownload={handlePreviewDownload}
        />
      )}
    </div>
  );
}

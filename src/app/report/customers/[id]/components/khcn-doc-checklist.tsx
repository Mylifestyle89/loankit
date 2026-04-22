"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, Check, Sparkles, Upload, Building2, Car, PiggyBank, Package } from "lucide-react";

import { DocxPreviewModal } from "@/components/docx-preview-modal";
import { METHOD_OPTIONS } from "@/lib/loan-plan/loan-plan-constants";
import { KhcnPlaceholderPanel } from "./khcn-placeholder-panel";
import { saveFileWithPicker } from "@/lib/save-file-with-picker";

type DocTemplate = { path: string; name: string };
type Category = { key: string; label: string; isAsset?: boolean; templates: DocTemplate[] };
type CollateralItem = { id: string; name: string; collateral_type: string; total_value?: number | null };

const COLLATERAL_TYPE_LABELS: Record<string, string> = {
  qsd_dat: "Bất động sản",
  dong_san: "Động sản",
  tiet_kiem: "Thẻ tiết kiệm",
  tai_san_khac: "Tài sản khác",
};

const COLLATERAL_TYPE_ICONS: Record<string, React.ElementType> = {
  qsd_dat: Building2,
  dong_san: Car,
  tiet_kiem: PiggyBank,
  tai_san_khac: Package,
};

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
  incomeSource,
}: {
  loanMethod?: string;
  customerId?: string;
  loanId?: string;
  incomeSource?: string;
}) {
  const [method, setMethod] = useState(initialMethod ?? "tung_lan");
  const [tab, setTab] = useState<TabKey>("docs");

  // Active loan selection
  const [loans, setLoans] = useState<LoanOption[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState(initialLoanId ?? "");

  useEffect(() => {
    if (!customerId) return;
    fetch(`/api/loans?customerId=${customerId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const loanList: LoanOption[] = (d.loans ?? []).map((l: Record<string, unknown>) => ({
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

  // Collateral selection (TSBĐ tab)
  const [collaterals, setCollaterals] = useState<CollateralItem[]>([]);
  const [selectedCollateralIds, setSelectedCollateralIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (tab !== "tsbd" || !customerId) return;
    fetch(`/api/customers/${customerId}/collaterals`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const items: CollateralItem[] = d.collaterals ?? [];
        setCollaterals(items);
        setSelectedCollateralIds(new Set(items.map((c) => c.id))); // default = all selected
      })
      .catch(() => {});
  }, [tab, customerId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setChecked(new Set()); // Reset checked when method changes
    const sourceParam = incomeSource ? `&income_source=${incomeSource}` : "";
    fetch(`/api/report/templates/khcn?loan_method=${method}${sourceParam}`, { signal: controller.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setCategories(d.categories ?? []);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setLoading(false);
      });
    return () => controller.abort();
  }, [method, incomeSource]);

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

  // Replace template file (upload new .docx to overwrite existing)
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const replacePathRef = useRef<string | null>(null);
  const handleReplace = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetPath = replacePathRef.current;
    e.target.value = "";
    if (!file || !targetPath) return;
    if (!file.name.toLowerCase().endsWith(".docx")) return;
    try {
      const buffer = await file.arrayBuffer();
      const res = await fetch(`/api/report/template/save-docx?path=${encodeURIComponent(targetPath)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: buffer,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Upload thất bại");
    } catch { /* silent — template files are non-critical */ }
    replacePathRef.current = null;
  }, []);

  const [generating, setGenerating] = useState<string | null>(null);
  const generatingRef = useRef(false);
  const [preview, setPreview] = useState<{ buffer: ArrayBuffer; filename: string } | null>(null);

  const handleGenerate = useCallback(async (path: string, name: string) => {
    if (!customerId || generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(path);
    try {
      const body: Record<string, unknown> = { customerId, templatePath: path, templateLabel: name, loanId };
      if (tab === "tsbd" && selectedCollateralIds.size > 0) {
        body.collateralIds = Array.from(selectedCollateralIds);
      }
      const res = await fetch("/api/report/templates/khcn/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setGenerating(null);
        return;
      }
      const cd = res.headers.get("Content-Disposition");
      const filename = cd
        ? decodeURIComponent(cd.split("filename*=UTF-8''")[1] ?? name + ".docx")
        : name + ".docx";

      const blob = await res.blob();
      await saveFileWithPicker(blob, filename);
    } catch { /* ignore */ }
    generatingRef.current = false;
    setGenerating(null);
  }, [customerId, loanId, tab, selectedCollateralIds]);

  const handlePreviewDownload = useCallback(async () => {
    if (!preview) return;
    const blob = new Blob([preview.buffer], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    await saveFileWithPicker(blob, preview.filename);
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
                    ? "bg-brand-500 text-white"
                    : "bg-white dark:bg-[#1a1a1a] text-zinc-600 dark:text-zinc-400 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-zinc-500">
          <span className="font-semibold text-brand-500">{checked.size}</span>/{totalDocs} hoàn thành
        </div>
      </div>

      {/* Active loan selector */}
      {loans.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">HĐTD:</span>
          <select
            value={selectedLoanId}
            onChange={(e) => setSelectedLoanId(e.target.value)}
            className="rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
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
                ? "bg-brand-500 text-white"
                : "bg-white dark:bg-[#1a1a1a] text-zinc-600 dark:text-zinc-400 hover:bg-brand-50 dark:hover:bg-brand-500/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Collateral picker — shown only in TSBĐ tab */}
      {tab === "tsbd" && collaterals.length > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Chọn tài sản bảo đảm để in
            </span>
            <button
              type="button"
              onClick={() =>
                setSelectedCollateralIds((prev) =>
                  prev.size === collaterals.length
                    ? new Set()
                    : new Set(collaterals.map((c) => c.id)),
                )
              }
              className="cursor-pointer text-xs text-brand-500 dark:text-brand-400 hover:underline"
            >
              {selectedCollateralIds.size === collaterals.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
          </div>
          <div className="space-y-1">
            {collaterals.map((col) => {
              const isSelected = selectedCollateralIds.has(col.id);
              const Icon = COLLATERAL_TYPE_ICONS[col.collateral_type] ?? Package;
              const typeLabel = COLLATERAL_TYPE_LABELS[col.collateral_type] ?? col.collateral_type;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() =>
                    setSelectedCollateralIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(col.id)) next.delete(col.id); else next.add(col.id);
                      return next;
                    })
                  }
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? "border-brand-300 dark:border-brand-500/40 bg-brand-50/50 dark:bg-brand-500/5"
                      : "border-zinc-100 dark:border-white/[0.05] hover:border-zinc-200 dark:hover:border-white/[0.09]"
                  }`}
                >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    isSelected
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-zinc-300 dark:border-white/[0.15]"
                  }`}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <Icon className="h-4 w-4 shrink-0 text-zinc-400 dark:text-slate-500" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-zinc-800 dark:text-slate-200 truncate block">{col.name}</span>
                    <span className="text-[10px] text-zinc-400 dark:text-slate-500">{typeLabel}</span>
                  </div>
                  {col.total_value != null && (
                    <span className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-slate-400">
                      {new Intl.NumberFormat("vi-VN").format(col.total_value)}đ
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {selectedCollateralIds.size === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Chưa chọn tài sản nào — báo cáo sẽ không có thông tin TSBĐ.
            </p>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-white/[0.05] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-300"
          style={{ width: totalDocs > 0 ? `${(checked.size / totalDocs) * 100}%` : "0%" }}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
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
                            : "border-zinc-300 dark:border-white/[0.15] hover:border-brand-400"
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3" />}
                      </button>
                      <FileText className="h-4 w-4 shrink-0 text-brand-400" />
                      <span className={`flex-1 text-sm ${isChecked ? "text-zinc-400 line-through" : ""}`}>{t.name}</span>
                      {customerId && (
                        <button
                          type="button"
                          onClick={() => handleGenerate(t.path, t.name)}
                          disabled={generating === t.path}
                          className="shrink-0 rounded-md p-1.5 text-brand-400 hover:bg-brand-100 hover:text-brand-500 dark:hover:bg-brand-400/10 transition-colors"
                          title="Tạo báo cáo"
                        >
                          {generating === t.path
                            ? <div className="h-3.5 w-3.5 animate-spin rounded-full border border-brand-300 border-t-brand-500" />
                            : <Sparkles className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDownload(t.path)}
                        className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10 transition-colors"
                        title="Tải mẫu gốc"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { replacePathRef.current = t.path; replaceInputRef.current?.click(); }}
                        className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 transition-colors"
                        title="Thay mẫu"
                      >
                        <Upload className="h-3.5 w-3.5" />
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

      {/* Hidden file input for template replace */}
      <input ref={replaceInputRef} type="file" accept=".docx" className="hidden" onChange={handleReplace} />

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

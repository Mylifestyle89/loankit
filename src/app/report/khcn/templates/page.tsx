"use client";

import { useCallback } from "react";
import { FileText } from "lucide-react";

import { KHCN_TEMPLATES, DOC_CATEGORY_LABELS, groupByCategory } from "@/lib/loan-plan/khcn-template-registry";
import { TemplateFileActions } from "@/app/report/khdn/template/_components/template-file-actions";

// Category display order
const CATEGORY_ORDER = [
  "danh_muc", "phap_ly", "hop_dong", "phuong_an",
  "bao_cao", "kiem_tra",
  "tai_san", "tai_san_qsd_dat", "tai_san_qsd_dat_bv", "tai_san_qsd_dat_bt3",
  "tai_san_glvd_bv", "tai_san_glvd_bt3", "tai_san_ptgt_bv", "tai_san_ptgt_bt3",
  "giai_ngan",
];

const grouped = groupByCategory(KHCN_TEMPLATES);

export default function KhcnTemplatesPage() {
  // No-op refresh — file is replaced server-side, registry is static
  const onRefresh = useCallback(() => {}, []);

  // Sort categories: known order first, then any remaining
  const categories = Object.keys(grouped).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-lg font-semibold">Quản lý mẫu KHCN</h1>
        <span className="text-xs text-zinc-400">({KHCN_TEMPLATES.length} mẫu)</span>
      </div>

      {categories.map((cat) => (
        <section key={cat}>
          <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-slate-300">
            {DOC_CATEGORY_LABELS[cat] ?? cat}
          </h2>
          <div className="rounded-lg border border-zinc-200 dark:border-white/10 divide-y divide-zinc-100 dark:divide-white/[0.06]">
            {grouped[cat].map((t) => (
              <div key={t.path} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate text-sm text-zinc-700 dark:text-slate-300" title={t.name}>
                  {t.name}
                </span>
                <TemplateFileActions
                  filePath={t.path.replace("report_assets/", "")}
                  fileName={t.path.split("/").pop() ?? t.name}
                  onRefresh={onRefresh}
                  editorAvailable={false}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

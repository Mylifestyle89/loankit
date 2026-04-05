"use client";

import { Download } from "lucide-react";
import type { FieldTemplateItem } from "../../types";

type ExportBlockProps = {
  t: (key: string) => string;
  customers: { id: string; customer_name: string; customer_code: string }[];
  selectedCustomerId: string;
  exportScope: "customer" | "common" | "all";
  setExportScope: (scope: "customer" | "common" | "all") => void;
  exportTemplateId: string;
  setExportTemplateId: (id: string) => void;
  exportTemplateOptions: FieldTemplateItem[];
  exportFieldCount: number;
  exportingCatalog: boolean;
  onExportCsv: () => void;
  onExportXlsx: () => void;
};

export function SidebarExportBlock({
  t,
  customers,
  selectedCustomerId,
  exportScope,
  setExportScope,
  exportTemplateId,
  setExportTemplateId,
  exportTemplateOptions,
  exportFieldCount,
  exportingCatalog,
  onExportCsv,
  onExportXlsx,
}: ExportBlockProps) {
  const SELECT_CLS =
    "w-full rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-white/[0.05] dark:text-slate-100 px-3 py-2 text-sm font-medium focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:focus:ring-amber-400/20";

  return (
    <>
      <div className="space-y-2 rounded-lg border border-slate-200/60 dark:border-white/[0.07] bg-amber-50/50 dark:bg-amber-500/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Export</p>

        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("mapping.export.scopeLabel")}</label>
        <select
          value={exportScope}
          onChange={(e) => setExportScope(e.target.value as "customer" | "common" | "all")}
          aria-label={t("mapping.export.scopeLabel")}
          className={SELECT_CLS}
        >
          <option value="customer">{t("mapping.export.scope.customer")}</option>
          <option value="common">{t("mapping.export.scope.common")}</option>
          <option value="all">{t("mapping.export.scope.all")}</option>
        </select>

        {exportScope === "customer" ? (
          selectedCustomerId
            ? <p className="text-xs text-slate-600 dark:text-slate-300">Khách hàng: <span className="font-medium">{customers.find((c) => c.id === selectedCustomerId)?.customer_name ?? t("mapping.selectCustomer")}</span></p>
            : <p className="text-xs text-amber-600">{t("mapping.export.scope.customerHint")}</p>
        ) : null}
        {exportScope === "common" ? (
          <p className="text-xs text-slate-600 dark:text-slate-300">{t("mapping.export.scope.commonHint")}</p>
        ) : null}

        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("mapping.export.templateLabel")}</label>
        <select
          value={exportTemplateId}
          onChange={(e) => setExportTemplateId(e.target.value)}
          aria-label={t("mapping.export.templateLabel")}
          disabled={exportTemplateOptions.length === 0}
          className={SELECT_CLS + " disabled:opacity-70"}
        >
          <option value="">{t("mapping.export.templatePlaceholder")}</option>
          {exportTemplateOptions.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
          ))}
        </select>

        <p className="text-xs text-slate-600 dark:text-slate-300">
          {t("mapping.export.fieldCount").replace("{count}", String(exportFieldCount))}
        </p>
      </div>

      <button
        type="button"
        onClick={onExportCsv}
        disabled={exportingCatalog || !exportTemplateId || exportFieldCount === 0}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-[#141414]/90 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.06] disabled:opacity-75"
      >
        <Download className="h-4 w-4 text-slate-600 dark:text-slate-300" />{t("mapping.export.csv")}
      </button>
      <button
        type="button"
        onClick={onExportXlsx}
        disabled={exportingCatalog || !exportTemplateId || exportFieldCount === 0}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-[#141414]/90 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.06] disabled:opacity-75"
      >
        <Download className="h-4 w-4 text-slate-600 dark:text-slate-300" />{t("mapping.export.xlsx")}
      </button>
    </>
  );
}

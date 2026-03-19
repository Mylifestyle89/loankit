"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { useMappingDataStore } from "@/app/report/khdn/mapping/stores/use-mapping-data-store";
import { computeEffectiveValues } from "@/core/use-cases/formula-processor";
import { CoverageProgressBar } from "@/components/coverage-progress-bar";
import { validateTemplateFields, type ValidatedField } from "@/lib/report/field-sync-utils";

type FieldCoveragePanelProps = {
  /** Placeholder keys extracted from the DOCX template */
  placeholders: string[];
};

/** Collapsible section for a group of validated fields */
function FieldSection({
  title,
  icon,
  fields,
  colorClass,
  defaultOpen,
}: {
  title: string;
  icon: React.ReactNode;
  fields: ValidatedField[];
  colorClass: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (fields.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.04] ${colorClass}`}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {icon}
        {title} ({fields.length})
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5 pl-2">
          {fields.map((f) => (
            <li key={f.fieldKey} className="group">
              {f.status === "no-data" ? (
                <Link
                  href={`/report/khdn/mapping?focus=${encodeURIComponent(f.fieldKey)}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-amber-700 dark:text-amber-400 transition-colors hover:bg-amber-50 dark:hover:bg-amber-500/10"
                  title={`Nhấn để điền field: ${f.fieldKey}`}
                >
                  <span className="truncate">{f.label}</span>
                  <span className="ml-auto text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">→ Mapping</span>
                </Link>
              ) : (
                <div className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-zinc-600 dark:text-slate-400">
                  <span className="truncate">{f.label}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Panel showing which template placeholders have data, which are missing data,
 * and which are unrecognized. Integrates with mapping store for live values.
 */
export function FieldCoveragePanel({ placeholders }: FieldCoveragePanelProps) {
  const fieldCatalog = useMappingDataStore((s) => s.fieldCatalog);
  const values = useMappingDataStore((s) => s.values);
  const formulas = useMappingDataStore((s) => s.formulas);

  const effectiveValues = useMemo(
    () => computeEffectiveValues({ values, formulas, fieldCatalog }),
    [values, formulas, fieldCatalog],
  );

  const validation = useMemo(
    () => validateTemplateFields(placeholders, fieldCatalog, effectiveValues),
    [placeholders, fieldCatalog, effectiveValues],
  );

  const total = validation.withData.length + validation.noData.length + validation.unknown.length;
  if (total === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-3 shadow-sm">
      <h4 className="text-xs font-bold tracking-tight text-zinc-800 dark:text-slate-200">
        Field Coverage
      </h4>
      {/* Progress summary */}
      <div className="mt-2">
        <CoverageProgressBar filled={validation.withData.length} total={total} barWidth="flex-1" />
      </div>

      {/* Sections */}
      <div className="mt-3 space-y-1">
        <FieldSection
          title="Chưa điền"
          icon={<AlertCircle className="h-3 w-3" />}
          fields={validation.noData}
          colorClass="text-amber-700 dark:text-amber-400"
          defaultOpen={true}
        />
        <FieldSection
          title="Có dữ liệu"
          icon={<CheckCircle2 className="h-3 w-3" />}
          fields={validation.withData}
          colorClass="text-emerald-700 dark:text-emerald-400"
          defaultOpen={false}
        />
        <FieldSection
          title="Không nhận dạng"
          icon={<HelpCircle className="h-3 w-3" />}
          fields={validation.unknown}
          colorClass="text-zinc-500 dark:text-slate-500"
          defaultOpen={false}
        />
      </div>
    </div>
  );
}

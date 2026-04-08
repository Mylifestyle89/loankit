"use client";

/**
 * Editable field section used by the DOCX import review modal.
 *
 * Always renders every label (even if empty) so the user can manually fill
 * in fields the AI missed. Filtering here used to cause focus loss when a
 * field was cleared mid-edit.
 *
 * The onChange surface takes `sectionKind` + `sectionIndex` so the parent
 * can pass a single stable callback instead of per-row inline arrows —
 * otherwise React.memo is defeated on every keystroke.
 */

import { memo } from "react";

import { formatVndNumber, parseVndNumber } from "@/lib/format-vnd-number";

export type FieldValue = string | number | undefined;

export type SectionKind = "customer" | "loan" | "collateral" | "co_borrower";

export type SectionChangeHandler = (
  kind: SectionKind,
  index: number,
  key: string,
  value: FieldValue,
) => void;

type Props = {
  title: string;
  labels: Record<string, string>;
  data: Record<string, FieldValue>;
  sectionKind: SectionKind;
  /** Index within the section array (0 for singletons like customer). */
  sectionIndex: number;
  onSectionChange: SectionChangeHandler;
  numberFieldKeys?: ReadonlySet<string>;
  headerAction?: React.ReactNode;
};

function FieldSectionImpl({
  title,
  labels,
  data,
  sectionKind,
  sectionIndex,
  onSectionChange,
  numberFieldKeys,
  headerAction,
}: Props) {
  const entries = Object.entries(labels);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</h4>
        {headerAction}
      </div>
      <div className="grid gap-2">
        {entries.map(([key, label]) => {
          const isNumber = numberFieldKeys?.has(key) ?? false;
          const rawValue = data[key];
          const displayValue = isNumber ? formatVndNumber(rawValue) : String(rawValue ?? "");
          return (
            <label key={key} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-xs font-medium text-zinc-500">{label}</span>
              <input
                value={displayValue}
                inputMode={isNumber ? "numeric" : undefined}
                onChange={(e) => {
                  const next: FieldValue = isNumber
                    ? parseVndNumber(e.target.value)
                    : e.target.value;
                  onSectionChange(sectionKind, sectionIndex, key, next);
                }}
                className="flex-1 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-300 dark:border-white/10 dark:bg-[#1a1a1a] dark:focus:border-brand-500/30"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

export const FieldSection = memo(FieldSectionImpl);

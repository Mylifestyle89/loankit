// FieldRow controls — type selector + action buttons (formula, change group, delete)

import { Pencil, Trash2, FunctionSquare } from "lucide-react";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { toBusinessType, toInternalType, type TypeLabelMap } from "../helpers";

type FieldRowControlsProps = {
  field: FieldCatalogItem;
  typeLabels: TypeLabelMap;
  formulaAllowed: boolean;
  hasFormula: boolean;
  changeGroupTitle: string;
  deleteFieldTitle: string;
  onFieldTypeChange: (fieldKey: string, type: FieldCatalogItem["type"]) => void;
  onOpenChangeGroupModal: (fieldKey: string) => void;
  onDeleteField: (fieldKey: string) => void;
  onOpenFormula?: () => void;
  navigateField: (e: React.KeyboardEvent<HTMLElement>, col: "label" | "value" | "type") => void;
};

export function FieldRowControls({
  field,
  typeLabels,
  formulaAllowed,
  hasFormula,
  changeGroupTitle,
  deleteFieldTitle,
  onFieldTypeChange,
  onOpenChangeGroupModal,
  onDeleteField,
  onOpenFormula,
  navigateField,
}: FieldRowControlsProps) {
  return (
    <>
      {/* Type selector */}
      <div className="min-w-0 w-full pt-1">
        <select
          value={toBusinessType(field.type)}
          onChange={(e) =>
            onFieldTypeChange(
              field.field_key,
              toInternalType(e.target.value as "string" | "number" | "percent" | "date" | "table"),
            )
          }
          onKeyDown={(e) => navigateField(e, "type")}
          data-field-col="type"
          aria-label={`Kiểu dữ liệu cho ${field.label_vi}`}
          className="cursor-pointer h-8 w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-zinc-800 dark:text-slate-200 transition-colors hover:border-zinc-200 focus:border-primary-500 focus:bg-white dark:focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="string">{typeLabels.string}</option>
          <option value="number">{typeLabels.number}</option>
          <option value="percent">{typeLabels.percent}</option>
          <option value="date">{typeLabels.date}</option>
          <option value="table">{typeLabels.table}</option>
        </select>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-1 pt-1 opacity-0 transition-opacity group-hover:opacity-100">
        {formulaAllowed && onOpenFormula ? (
          <button
            type="button"
            onClick={onOpenFormula}
            className={`rounded p-1 ${hasFormula ? "bg-primary-100 text-primary-700" : "text-zinc-700 hover:bg-primary-100 hover:text-primary-800"}`}
            title={hasFormula ? "Sửa công thức" : "Nhập công thức"}
          >
            <FunctionSquare className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onOpenChangeGroupModal(field.field_key)}
          className="rounded p-1 text-zinc-700 hover:bg-primary-100 hover:text-primary-800"
          title={changeGroupTitle}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDeleteField(field.field_key)}
          className="rounded p-1 text-zinc-700 hover:bg-red-50 hover:text-red-700"
          title={deleteFieldTitle}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </>
  );
}

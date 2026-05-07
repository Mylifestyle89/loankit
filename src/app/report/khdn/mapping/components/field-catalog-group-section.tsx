// FieldCatalogBoard group section — parent group header + collapsible subgroup rows with fields

import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { CatalogViewData, CatalogGroupActions, CatalogFieldActions } from "../types";
import { FieldRow } from "./field-row";
import type { GroupedTreeNode } from "@/core/use-cases/mapping-engine";

type FieldCatalogGroupSectionProps = {
  node: GroupedTreeNode;
  t: (key: string) => string;
  collapsedParentGroups: string[];
  data: CatalogViewData;
  groupActions: Pick<CatalogGroupActions, "toggleRepeaterGroup" | "prepareAddFieldForGroup" | "openEditGroupModal" | "onDeleteGroup">;
  fieldActions: CatalogFieldActions;
};

export function FieldCatalogGroupSection({
  node,
  t,
  collapsedParentGroups,
  data: { values, fieldCatalog, showTechnicalKeys, typeLabels, formulas, confidenceByField, sampleByField, ocrSuggestionsByField },
  groupActions: { toggleRepeaterGroup, prepareAddFieldForGroup, openEditGroupModal, onDeleteGroup },
  fieldActions: { onRepeaterItemChange, onManualChange, removeRepeaterItem, addRepeaterItem, onFieldLabelChange, onFieldTypeChange, onMoveField, onOpenChangeGroupModal, onDeleteField, onOpenFormulaModal, onAcceptOcrSuggestion, onDeclineOcrSuggestion },
}: FieldCatalogGroupSectionProps) {
  const isCollapsed = collapsedParentGroups.includes(node.parent);

  return (
    <div className={isCollapsed ? "hidden" : "space-y-3"}>
      {/* Parent group header */}
      <div className="flex items-center gap-2.5 pt-1 pb-0.5">
        <span className="shrink-0 text-[13px] font-bold tracking-wide text-primary-600 dark:text-primary-400">
          {node.parent}
        </span>
        <div className="flex-1 border-t border-primary-200/60 dark:border-primary-500/25" />
      </div>

      {node.children.map((child) => (
        <div key={child.fullPath} className="space-y-2">
          {/* Subgroup toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/60 dark:border-white/[0.07] bg-slate-50/70 dark:bg-white/[0.04] p-2">
            <span className="rounded-full bg-primary-100 dark:bg-primary-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
              {child.subgroup || t("mapping.groupPathRoot")}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => toggleRepeaterGroup(child.fullPath)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                  child.fields.some((f) => f.is_repeater)
                    ? "border-primary-200 bg-primary-100 text-primary-700 hover:bg-primary-200 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-300 dark:hover:bg-primary-500/20"
                    : "border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] text-zinc-600 dark:text-slate-300 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-500/10"
                }`}
                title="Chuyển đổi thành nhóm lặp (Repeater)"
              >
                <Layers className="h-3 w-3" />
                {child.fields.some((f) => f.is_repeater) ? "Tắt Nhóm Lặp" : "Nhóm Lặp"}
              </button>
              <button
                type="button"
                onClick={() => prepareAddFieldForGroup(child.fullPath)}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-slate-300 transition-colors hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:text-primary-700 dark:hover:text-primary-400"
              >
                <Plus className="h-3 w-3" />
                {t("mapping.addField")}
              </button>
              <button
                type="button"
                onClick={() => openEditGroupModal(child.fullPath)}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-slate-300 transition-colors hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:text-primary-700 dark:hover:text-primary-400"
              >
                <Pencil className="h-3 w-3" />
                {t("mapping.editGroup")}
              </button>
              <button
                type="button"
                onClick={() => onDeleteGroup(child.fullPath)}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200/70 bg-rose-50/60 px-2 py-1 text-[11px] font-medium text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700"
              >
                <Trash2 className="h-3 w-3" />
                {t("mapping.deleteGroup")}
              </button>
            </div>
          </div>

          {child.fields.length === 0 && (
            <p className="rounded-lg border border-dashed border-zinc-200 dark:border-white/[0.08] px-4 py-3 text-xs text-zinc-500 dark:text-slate-400">
              {t("mapping.emptySubgroupHint")}
            </p>
          )}

          {/* Repeater group */}
          {child.fields.some((f) => f.is_repeater) ? (
            <div className="space-y-4 rounded-lg border border-primary-200/60 bg-primary-50/30 p-4">
              {((Array.isArray(values[child.fullPath]) ? values[child.fullPath] : []) as Record<string, unknown>[]).map(
                (item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-primary-200/60 bg-white dark:bg-[#141414]/90 shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-primary-100 bg-primary-100 dark:bg-primary-500/10 px-4 py-2">
                      <span className="text-xs font-semibold text-primary-700">Bản ghi #{index + 1}</span>
                      <button
                        onClick={() => removeRepeaterItem(child.fullPath, index)}
                        className="rounded p-1 text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        title="Xóa bản ghi"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-col">
                      <SortableContext
                        items={child.fields.map((f) => `${f.field_key}___${index}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        {child.fields.map((field) => (
                          <div
                            key={`${field.field_key}___${index}`}
                            className="border-b border-zinc-100 dark:border-white/[0.06] last:border-0"
                          >
                            <FieldRow
                              dndId={`${field.field_key}___${index}`}
                              field={field}
                              value={item[field.field_key]}
                              showTechnicalKeys={showTechnicalKeys}
                              canMoveUp={fieldCatalog.findIndex((f) => f.field_key === field.field_key) > 0}
                              canMoveDown={fieldCatalog.findIndex((f) => f.field_key === field.field_key) < fieldCatalog.length - 1}
                              typeLabels={typeLabels}
                              columnValuePlaceholder={t("mapping.column.value")}
                              typeHintNumber={t("mapping.typeHintNumber")}
                              typeHintPercent={t("mapping.typeHintPercent")}
                              typeHintTable={t("mapping.typeHintTable")}
                              tablePasteHint={t("mapping.tablePasteHint")}
                              moveUpTitle={t("mapping.moveUp")}
                              moveDownTitle={t("mapping.moveDown")}
                              changeGroupTitle={t("mapping.changeGroup")}
                              deleteFieldTitle={t("mapping.deleteField")}
                              onManualChange={(f, raw) => onRepeaterItemChange(child.fullPath, index, f, raw)}
                              onFieldLabelChange={onFieldLabelChange}
                              onFieldTypeChange={onFieldTypeChange}
                              onMoveField={onMoveField}
                              onOpenChangeGroupModal={onOpenChangeGroupModal}
                              onDeleteField={onDeleteField}
                              valueReadOnly={field.is_repeater && field.label_vi.trim().toUpperCase() === "STT"}
                              confidenceScore={confidenceByField[field.field_key] ?? 0}
                              sampleData={sampleByField[field.field_key] ?? ""}
                              ocrSuggestion={ocrSuggestionsByField[field.field_key]}
                              onAcceptOcrSuggestion={onAcceptOcrSuggestion}
                              onDeclineOcrSuggestion={onDeclineOcrSuggestion}
                            />
                          </div>
                        ))}
                      </SortableContext>
                    </div>
                  </div>
                ),
              )}
              <button
                type="button"
                onClick={() => addRepeaterItem(child.fullPath)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary-300 bg-primary-50/50 px-4 py-2 text-sm font-medium text-primary-600 transition-colors hover:border-primary-400 hover:bg-primary-100"
              >
                <Plus className="h-4 w-4" />
                Thêm bản ghi {child.subgroup || t("mapping.groupPathRoot")}
              </button>
            </div>
          ) : (
            /* Normal (non-repeater) field list */
            <div className="flex flex-col gap-2">
              <SortableContext items={child.fields.map((f) => f.field_key)} strategy={verticalListSortingStrategy}>
                {child.fields.map((field, indexInGroup) => {
                  const formulaAllowed =
                    field.type === "number" ||
                    field.type === "percent" ||
                    field.type === "date" ||
                    field.type === "text";
                  return (
                    <div
                      key={field.field_key}
                      className="w-full max-w-full min-w-0 flex-shrink-0 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#141414]/90 p-0 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <FieldRow
                        field={field}
                        value={values[field.field_key]}
                        showTechnicalKeys={showTechnicalKeys}
                        canMoveUp={indexInGroup > 0}
                        canMoveDown={indexInGroup < child.fields.length - 1}
                        typeLabels={typeLabels}
                        columnValuePlaceholder={t("mapping.column.value")}
                        typeHintNumber={t("mapping.typeHintNumber")}
                        typeHintPercent={t("mapping.typeHintPercent")}
                        typeHintTable={t("mapping.typeHintTable")}
                        tablePasteHint={t("mapping.tablePasteHint")}
                        moveUpTitle={t("mapping.moveUp")}
                        moveDownTitle={t("mapping.moveDown")}
                        changeGroupTitle={t("mapping.changeGroup")}
                        deleteFieldTitle={t("mapping.deleteField")}
                        onManualChange={onManualChange}
                        onFieldLabelChange={onFieldLabelChange}
                        onFieldTypeChange={onFieldTypeChange}
                        onMoveField={onMoveField}
                        onOpenChangeGroupModal={onOpenChangeGroupModal}
                        onDeleteField={onDeleteField}
                        formulaAllowed={formulaAllowed}
                        hasFormula={!!formulas[field.field_key]}
                        onOpenFormula={() => onOpenFormulaModal(field.field_key)}
                        confidenceScore={confidenceByField[field.field_key] ?? 0}
                        sampleData={sampleByField[field.field_key] ?? ""}
                        ocrSuggestion={ocrSuggestionsByField[field.field_key]}
                        onAcceptOcrSuggestion={onAcceptOcrSuggestion}
                        onDeclineOcrSuggestion={onDeclineOcrSuggestion}
                      />
                    </div>
                  );
                })}
              </SortableContext>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

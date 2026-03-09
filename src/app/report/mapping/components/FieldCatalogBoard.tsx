import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { DndContext, closestCenter, type DragEndEvent, type SensorDescriptor, type SensorOptions } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Group, Panel, Separator } from "react-resizable-panels";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { TypeLabelMap } from "../helpers";
import { FieldRow } from "./FieldRow";
import type { OcrSuggestionMap } from "../types";

type GroupedTreeNode = {
  parent: string;
  children: Array<{ fullPath: string; subgroup: string; fields: FieldCatalogItem[] }>;
};

type FieldCatalogBoardProps = {
  t: (key: string) => string;
  sensors: SensorDescriptor<SensorOptions>[];
  onDragEnd: (event: DragEndEvent) => void;
  groupedFieldTree: GroupedTreeNode[];
  hasContext: boolean;
  parentGroups: string[];
  collapsedParentGroups: string[];
  collapseAllGroups: () => void;
  expandAllGroups: () => void;
  onOpenAddFieldModal: () => void;
  openCreateSubgroupModal: (parentGroup: string) => void;
  toggleParentCollapse: (parent: string) => void;
  toggleRepeaterGroup: (groupPath: string) => void;
  prepareAddFieldForGroup: (groupPath: string) => void;
  openEditGroupModal: (group: string) => void;
  onDeleteGroup: (groupPath: string) => void;
  values: Record<string, unknown>;
  fieldCatalog: FieldCatalogItem[];
  showTechnicalKeys: boolean;
  typeLabels: TypeLabelMap;
  onRepeaterItemChange: (groupPath: string, index: number, field: FieldCatalogItem, rawVal: string) => void;
  onManualChange: (field: FieldCatalogItem, rawValue: string) => void;
  removeRepeaterItem: (groupPath: string, index: number) => void;
  addRepeaterItem: (groupPath: string) => void;
  onFieldLabelChange: (fieldKey: string, labelVi: string) => void;
  onFieldTypeChange: (fieldKey: string, type: FieldCatalogItem["type"]) => void;
  onMoveField: (fieldKey: string, direction: "up" | "down") => void;
  onOpenChangeGroupModal: (fieldKey: string) => void;
  onDeleteField: (fieldKey: string) => void;
  formulas: Record<string, string>;
  onOpenFormulaModal: (fieldKey: string) => void;
  confidenceByField: Record<string, number>;
  sampleByField: Record<string, string>;
  ocrSuggestionsByField: OcrSuggestionMap;
  onAcceptOcrSuggestion: (fieldKey: string) => void;
  onDeclineOcrSuggestion: (fieldKey: string) => void;
};

export function FieldCatalogBoard({
  t,
  sensors,
  onDragEnd,
  groupedFieldTree,
  hasContext,
  parentGroups,
  collapsedParentGroups,
  collapseAllGroups,
  expandAllGroups,
  onOpenAddFieldModal,
  openCreateSubgroupModal,
  toggleParentCollapse,
  toggleRepeaterGroup,
  prepareAddFieldForGroup,
  openEditGroupModal,
  onDeleteGroup,
  values,
  fieldCatalog,
  showTechnicalKeys,
  typeLabels,
  onRepeaterItemChange,
  onManualChange,
  removeRepeaterItem,
  addRepeaterItem,
  onFieldLabelChange,
  onFieldTypeChange,
  onMoveField,
  onOpenChangeGroupModal,
  onDeleteField,
  formulas,
  onOpenFormulaModal,
  confidenceByField,
  sampleByField,
  ocrSuggestionsByField,
  onAcceptOcrSuggestion,
  onDeclineOcrSuggestion,
}: FieldCatalogBoardProps) {
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis]}>
      <motion.div
        key={fieldCatalog.map((f) => f.field_key).join("|")}
        initial={{ opacity: 0.35 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="overflow-hidden rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white/90 dark:bg-[#141414]/90 shadow-sm"
        style={{ height: "calc(100vh - 220px)", minHeight: 420 }}
      >
        <Group orientation="horizontal" className="h-full min-h-0 w-full">
          {/* Left column: Group chips */}
          <Panel defaultSize="230px" minSize="180px" maxSize="42%" className="min-w-0">
            <div className="min-w-0 h-full min-h-0 flex flex-col border-r border-zinc-200 dark:border-white/[0.08] bg-zinc-50/80 dark:bg-[#0a0a0a]">
              {/* Sticky header */}
              <div className="shrink-0 flex items-center gap-1.5 border-b border-zinc-200/70 dark:border-white/[0.07] bg-zinc-50/95 dark:bg-[#0a0a0a] px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-slate-400 backdrop-blur-sm">
                <span className="flex-1 truncate">{t("mapping.column.field")}</span>
                <button
                  type="button"
                  onClick={collapseAllGroups}
                  disabled={parentGroups.length === 0 || collapsedParentGroups.length === parentGroups.length}
                  className="rounded-md border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] p-1 text-zinc-500 dark:text-slate-400 transition-colors hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:border-violet-300 hover:text-violet-600 dark:hover:text-violet-400 disabled:opacity-30"
                  title={t("mapping.collapseAllGroups")}
                >
                  <ChevronsUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={expandAllGroups}
                  disabled={collapsedParentGroups.length === 0}
                  className="rounded-md border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] p-1 text-zinc-500 dark:text-slate-400 transition-colors hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:border-violet-300 hover:text-violet-600 dark:hover:text-violet-400 disabled:opacity-30"
                  title={t("mapping.expandAllGroups")}
                >
                  <ChevronsDown className="h-3 w-3" />
                </button>
              </div>

              {/* Scrollable group list */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2.5">
              {groupedFieldTree.length === 0 ? null : (
                <div className="flex flex-wrap gap-1.5">
                  {groupedFieldTree.map((node) => (
                    <div key={node.parent} className="flex flex-col gap-1">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleParentCollapse(node.parent)}
                          title={node.parent}
                          className="inline-flex flex-1 min-w-0 items-center gap-1 rounded-lg border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 px-2 py-1 text-[11px] font-medium text-violet-800 dark:text-violet-400 transition-colors hover:bg-violet-100 dark:hover:bg-violet-500/20"
                        >
                          {collapsedParentGroups.includes(node.parent) ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronUp className="h-3 w-3 shrink-0" />}
                          <span className="truncate">{node.parent}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openCreateSubgroupModal(node.parent)}
                          className="shrink-0 rounded-md border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] p-1.5 text-zinc-500 dark:text-slate-400 transition-colors hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-400"
                          title={t("mapping.addSubgroup")}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      {!collapsedParentGroups.includes(node.parent)
                        ? node.children.map((child) => (
                            <div key={child.fullPath} className="flex flex-wrap gap-1 pl-2">
                              <span className="rounded-full border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:text-slate-300">
                                {child.subgroup || t("mapping.groupPathRoot")}
                              </span>
                            </div>
                          ))
                        : null}
                    </div>
                  ))}
                </div>
              )}
              </div>{/* end scrollable group list */}
            </div>{/* end left column */}
          </Panel>

          <Separator
            className="group relative hidden w-3 shrink-0 cursor-col-resize items-center justify-center bg-transparent outline-none md:flex"
            aria-label="Resize panels"
          >
            <div className="h-full w-px rounded-full bg-slate-200/70 transition-colors group-hover:bg-violet-300/80 group-focus-visible:bg-violet-400 group-data-[resize-handle-state=drag]:bg-violet-500" />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-2 -translate-x-1/2 rounded-full bg-violet-100/0 transition-colors group-hover:bg-violet-100/70 group-focus-visible:bg-violet-100/80 group-data-[resize-handle-state=drag]:bg-violet-200/80" />
          </Separator>

          {/* Right column: Field chips */}
          <Panel minSize="58%" className="min-w-0">
            <div className="min-w-0 h-full min-h-0 overflow-y-auto overflow-x-hidden p-3">
        {groupedFieldTree.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center">
            {!hasContext ? (
              <>
                <h3 className="mb-1 text-base font-semibold text-zinc-800 dark:text-slate-100">Chưa chọn ngữ cảnh làm việc</h3>
                <p className="mb-4 max-w-sm text-sm text-zinc-500 dark:text-slate-400">
                  Vui lòng bấm nút &quot;Lựa chọn khách hàng&quot; ở góc trên bên phải để bắt đầu làm việc, hoặc tạo một mẫu dữ liệu mới.
                </p>
              </>
            ) : (
              <>
                <h3 className="mb-1 text-base font-semibold text-zinc-800 dark:text-slate-100">Mẫu dữ liệu này đang trống</h3>
                <p className="mb-4 max-w-sm text-sm text-zinc-500 dark:text-slate-400">
                  Bạn có thể bắt đầu xây dựng mẫu bằng cách thêm Group hoặc Custom Field đầu tiên.
                </p>
                <button
                  type="button"
                  onClick={onOpenAddFieldModal}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm text-white shadow-sm shadow-violet-500/25 transition-all duration-200 hover:shadow-md hover:shadow-violet-500/30 hover:brightness-110"
                >
                  <Plus className="h-4 w-4" />
                  Thêm trường dữ liệu (Field)
                </button>
              </>
            )}
          </div>
        ) : null}

        {groupedFieldTree.map((node) => (
          <div key={node.parent} className={collapsedParentGroups.includes(node.parent) ? "hidden" : "space-y-3"}>
            {/* Parent group header */}
            <div className="flex items-center gap-2.5 pt-1 pb-0.5">
              <span className="shrink-0 text-[13px] font-bold tracking-wide text-violet-700 dark:text-violet-400">
                {node.parent}
              </span>
              <div className="flex-1 border-t border-violet-200/60 dark:border-violet-500/25" />
            </div>
            {!collapsedParentGroups.includes(node.parent)
              ? node.children.map((child) => (
                  <div key={child.fullPath} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/60 dark:border-white/[0.07] bg-slate-50/70 dark:bg-white/[0.04] p-2">
                      <span className="rounded-full bg-violet-100 dark:bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-400">
                        {child.subgroup || t("mapping.groupPathRoot")}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleRepeaterGroup(child.fullPath)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${child.fields.some((f) => f.is_repeater) ? "border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-200 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20" : "border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] text-zinc-600 dark:text-slate-300 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 dark:hover:bg-amber-500/10"}`}
                          title="Chuyển đổi thành nhóm lặp (Repeater)"
                        >
                          <Layers className="h-3 w-3" />
                          {child.fields.some((f) => f.is_repeater) ? "Tắt Nhóm Lặp" : "Nhóm Lặp"}
                        </button>
                        <button
                          type="button"
                          onClick={() => prepareAddFieldForGroup(child.fullPath)}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-slate-300 transition-colors hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-800 dark:hover:text-violet-400"
                        >
                          <Plus className="h-3 w-3" />
                          {t("mapping.addField")}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditGroupModal(child.fullPath)}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-slate-300 transition-colors hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-800 dark:hover:text-violet-400"
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

                    {child.fields.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-zinc-200 dark:border-white/[0.08] px-4 py-3 text-xs text-zinc-500 dark:text-slate-400">{t("mapping.emptySubgroupHint")}</p>
                    ) : null}

                    {child.fields.some((f) => f.is_repeater) ? (
                      <div className="space-y-4 rounded-lg border border-amber-200/60 bg-amber-50/30 p-4">
                        {((Array.isArray(values[child.fullPath]) ? values[child.fullPath] : []) as Record<string, unknown>[]).map((item, index) => (
                          <div key={index} className="rounded-xl border border-amber-200/60 bg-white dark:bg-[#141414]/90 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50 dark:bg-amber-500/10 px-4 py-2">
                              <span className="text-xs font-semibold text-amber-800">Bản ghi #{index + 1}</span>
                              <button
                                onClick={() => removeRepeaterItem(child.fullPath, index)}
                                className="rounded p-1 text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                                title="Xóa bản ghi"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="flex flex-col">
                              <SortableContext items={child.fields.map((f) => `${f.field_key}___${index}`)} strategy={verticalListSortingStrategy}>
                                {child.fields.map((field) => (
                                  <div key={`${field.field_key}___${index}`} className="border-b border-zinc-100 dark:border-white/[0.06] last:border-0">
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
                        ))}
                        <button
                          type="button"
                          onClick={() => addRepeaterItem(child.fullPath)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:border-amber-400 hover:bg-amber-100"
                        >
                          <Plus className="h-4 w-4" />
                          Thêm bản ghi {child.subgroup || t("mapping.groupPathRoot")}
                        </button>
                      </div>
                    ) : (
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
                ))
              : null}
          </div>
        ))}
            </div>
          </Panel>
        </Group>
      </motion.div>
    </DndContext>
  );
}

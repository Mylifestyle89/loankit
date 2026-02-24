import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { DndContext, closestCenter, type DragEndEvent, type SensorDescriptor, type SensorOptions } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { TypeLabelMap } from "../helpers";
import { FieldRow } from "./FieldRow";

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
}: FieldCatalogBoardProps) {
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis]}>
      <motion.div
        key={fieldCatalog.map((f) => f.field_key).join("|")}
        initial={{ opacity: 0.35 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="grid min-h-[320px] grid-cols-1 overflow-hidden rounded-xl border border-zinc-200 bg-white/90 shadow-sm md:grid-cols-[260px_1fr]"
      >
        {/* Left column: Group chips */}
        <div className="min-w-0 max-h-[calc(100vh-250px)] overflow-y-auto overflow-x-hidden pr-2 flex flex-col gap-2 border-r border-zinc-200 bg-zinc-50/80 p-3">
          <div className="flex items-center gap-1.5 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <span>{t("mapping.column.field")}</span>
            <button
              type="button"
              onClick={collapseAllGroups}
              disabled={parentGroups.length === 0 || collapsedParentGroups.length === parentGroups.length}
              className="rounded-lg border border-zinc-300 bg-white p-1 text-zinc-600 transition-colors hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-40"
              title={t("mapping.collapseAllGroups")}
            >
              <ChevronsUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={expandAllGroups}
              disabled={collapsedParentGroups.length === 0}
              className="rounded-lg border border-zinc-300 bg-white p-1 text-zinc-600 transition-colors hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-40"
              title={t("mapping.expandAllGroups")}
            >
              <ChevronsDown className="h-3 w-3" />
            </button>
          </div>

          {groupedFieldTree.length === 0 ? null : (
            <div className="flex flex-wrap gap-1.5">
              {groupedFieldTree.map((node) => (
                <div key={node.parent} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleParentCollapse(node.parent)}
                      className="inline-flex flex-1 items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-800 transition-colors hover:bg-indigo-100"
                    >
                      {collapsedParentGroups.includes(node.parent) ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                      <span className="truncate">{node.parent}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openCreateSubgroupModal(node.parent)}
                      className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-indigo-100 hover:text-indigo-700"
                      title={t("mapping.addSubgroup")}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  {!collapsedParentGroups.includes(node.parent)
                    ? node.children.map((child) => (
                        <div key={child.fullPath} className="flex flex-wrap gap-1 pl-2">
                          <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600">
                            {child.subgroup || t("mapping.groupPathRoot")}
                          </span>
                        </div>
                      ))
                    : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Field chips */}
        <div className="min-w-0 max-h-[calc(100vh-250px)] overflow-y-auto overflow-x-hidden pr-2 p-3">
        {groupedFieldTree.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center">
            {!hasContext ? (
              <>
                <h3 className="mb-1 text-base font-semibold text-zinc-800">Chưa chọn ngữ cảnh làm việc</h3>
                <p className="mb-4 max-w-sm text-sm text-zinc-500">
                  Vui lòng bấm nút &quot;Lựa chọn khách hàng&quot; ở góc trên bên phải để bắt đầu làm việc, hoặc tạo một mẫu dữ liệu mới.
                </p>
              </>
            ) : (
              <>
                <h3 className="mb-1 text-base font-semibold text-zinc-800">Mẫu dữ liệu này đang trống</h3>
                <p className="mb-4 max-w-sm text-sm text-zinc-500">
                  Bạn có thể bắt đầu xây dựng mẫu bằng cách thêm Group hoặc Custom Field đầu tiên.
                </p>
                <button
                  type="button"
                  onClick={onOpenAddFieldModal}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white shadow-glow transition-colors hover:bg-indigo-700"
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
            {!collapsedParentGroups.includes(node.parent)
              ? node.children.map((child) => (
                  <div key={child.fullPath} className="space-y-2">
                    <div className="group/group-header flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                        {child.subgroup || t("mapping.groupPathRoot")}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/group-header:opacity-100">
                        <button
                          type="button"
                          onClick={() => toggleRepeaterGroup(child.fullPath)}
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${child.fields.some((f) => f.is_repeater) ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "text-zinc-500 hover:bg-amber-100 hover:text-amber-800"}`}
                          title="Chuyển đổi thành nhóm lặp (Repeater)"
                        >
                          <Layers className="h-3 w-3" />
                          {child.fields.some((f) => f.is_repeater) ? "Tắt Nhóm Lặp" : "Nhóm Lặp"}
                        </button>
                        <button
                          type="button"
                          onClick={() => prepareAddFieldForGroup(child.fullPath)}
                          className="rounded-full px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-indigo-100 hover:text-indigo-800"
                        >
                          <Plus className="h-3 w-3" />
                          {t("mapping.addField")}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditGroupModal(child.fullPath)}
                          className="rounded-full px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-indigo-100 hover:text-indigo-800"
                        >
                          <Pencil className="h-3 w-3" />
                          {t("mapping.editGroup")}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteGroup(child.fullPath)}
                          className="rounded-full px-1.5 py-0.5 text-[11px] font-medium text-rose-500 transition-colors hover:bg-rose-100 hover:text-rose-700"
                        >
                          <Trash2 className="h-3 w-3" />
                          {t("mapping.deleteGroup")}
                        </button>
                      </div>
                    </div>

                    {child.fields.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-3 text-xs text-zinc-500">{t("mapping.emptySubgroupHint")}</p>
                    ) : null}

                    {child.fields.some((f) => f.is_repeater) ? (
                      <div className="space-y-4 rounded-lg border border-amber-200/60 bg-amber-50/30 p-4">
                        {((Array.isArray(values[child.fullPath]) ? values[child.fullPath] : []) as Record<string, unknown>[]).map((item, index) => (
                          <div key={index} className="rounded-xl border border-amber-200/60 bg-white shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50 px-4 py-2">
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
                                  <div key={`${field.field_key}___${index}`} className="border-b border-zinc-100 last:border-0">
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
                                className="w-full max-w-full min-w-0 flex-shrink-0 rounded-xl border border-zinc-200 bg-white p-0 shadow-sm transition-shadow hover:shadow-md"
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
      </motion.div>
    </DndContext>
  );
}

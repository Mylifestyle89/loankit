import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Layers } from "lucide-react";
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
}: FieldCatalogBoardProps) {
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis]}>
      <div className="max-h-[70vh] overflow-auto rounded-xl border border-coral-tree-200 bg-white">
        <div className="sticky top-0 z-10 grid grid-cols-[minmax(260px,1fr)_minmax(360px,2fr)_160px_64px] border-b border-coral-tree-200 bg-coral-tree-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-coral-tree-600">
          <div className="flex items-center gap-2">
            <span>{t("mapping.column.field")}</span>
            <button
              type="button"
              onClick={collapseAllGroups}
              disabled={parentGroups.length === 0 || collapsedParentGroups.length === parentGroups.length}
              className="rounded border border-coral-tree-300 bg-white p-0.5 text-coral-tree-600 hover:bg-coral-tree-50 disabled:opacity-40"
              title={t("mapping.collapseAllGroups")}
            >
              <ChevronsUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={expandAllGroups}
              disabled={collapsedParentGroups.length === 0}
              className="rounded border border-coral-tree-300 bg-white p-0.5 text-coral-tree-600 hover:bg-coral-tree-50 disabled:opacity-40"
              title={t("mapping.expandAllGroups")}
            >
              <ChevronsDown className="h-3 w-3" />
            </button>
          </div>
          <div>{t("mapping.column.value")}</div>
          <div>{t("mapping.column.typeSource")}</div>
          <div className="flex items-center justify-center" />
        </div>

        {groupedFieldTree.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            {!hasContext ? (
              <>
                <h3 className="text-base font-semibold text-coral-tree-800 mb-1">Chưa chọn ngữ cảnh làm việc</h3>
                <p className="text-sm text-coral-tree-500 mb-4 max-w-sm">
                  Vui lòng bấm nút {"\""}Lựa chọn khách hàng{"\""} ở góc trên bên phải để bắt đầu làm việc, hoặc tạo một mẫu dữ liệu mới.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-coral-tree-800 mb-1">Mẫu dữ liệu này đang trống</h3>
                <p className="text-sm text-coral-tree-500 mb-4 max-w-sm">
                  Bạn có thể bắt đầu xây dựng mẫu bằng cách thêm Group hoặc Custom Field đầu tiên.
                </p>
                <button
                  type="button"
                  onClick={onOpenAddFieldModal}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-md bg-coral-tree-700 px-4 py-2 text-sm text-white shadow-sm hover:bg-coral-tree-800"
                >
                  <Plus className="h-4 w-4" />
                  Thêm trường dữ liệu (Field)
                </button>
              </>
            )}
          </div>
        ) : null}

        {groupedFieldTree.map((node) => (
          <div key={node.parent} className="border-b border-coral-tree-200 last:border-0">
            <div className="sticky top-9 z-[5] flex items-center justify-between border-t border-coral-tree-200 bg-coral-tree-100 px-4 py-2 text-xs uppercase tracking-wider text-coral-tree-700">
              <span className="font-semibold">{node.parent}</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openCreateSubgroupModal(node.parent)}
                  className="flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-medium text-coral-tree-600 shadow-sm border border-coral-tree-200 hover:bg-coral-tree-50 hover:text-coral-tree-900"
                  title={t("mapping.addSubgroup")}
                >
                  <Plus className="h-3 w-3" />
                  {t("mapping.addSubgroup")}
                </button>
                <button
                  type="button"
                  onClick={() => toggleParentCollapse(node.parent)}
                  className="flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-medium text-coral-tree-600 shadow-sm border border-coral-tree-200 hover:bg-coral-tree-50 hover:text-coral-tree-900"
                  title={collapsedParentGroups.includes(node.parent) ? t("mapping.expandGroup") : t("mapping.collapseGroup")}
                >
                  {collapsedParentGroups.includes(node.parent) ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {!collapsedParentGroups.includes(node.parent)
              ? node.children.map((child, childIndex) => (
                  <div key={child.fullPath} className={childIndex > 0 ? "border-t border-coral-tree-200" : ""}>
                    <div className="group/group-header flex items-center justify-between bg-coral-tree-50/80 px-4 py-1.5 text-[11px] uppercase tracking-wide text-coral-tree-500 border-t border-b border-coral-tree-100 border-t-transparent">
                      <span className="font-semibold text-coral-tree-600 pl-6">{child.subgroup || t("mapping.groupPathRoot")}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover/group-header:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => toggleRepeaterGroup(child.fullPath)}
                          className={`flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors ${child.fields.some((f) => f.is_repeater) ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "text-coral-tree-500 hover:bg-amber-100 hover:text-amber-800"}`}
                          title="Chuyển đổi thành nhóm lặp (Repeater)"
                        >
                          <Layers className="h-3 w-3" />
                          {child.fields.some((f) => f.is_repeater) ? "Tắt Nhóm Lặp" : "Nhóm Lặp (Repeater)"}
                        </button>
                        <button
                          type="button"
                          onClick={() => prepareAddFieldForGroup(child.fullPath)}
                          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-coral-tree-500 hover:bg-coral-tree-200 hover:text-coral-tree-800"
                        >
                          <Plus className="h-3 w-3" />
                          {t("mapping.addField")}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditGroupModal(child.fullPath)}
                          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-coral-tree-500 hover:bg-coral-tree-200 hover:text-coral-tree-800"
                        >
                          <Pencil className="h-3 w-3" />
                          {t("mapping.editGroup")}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteGroup(child.fullPath)}
                          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-red-500 hover:bg-red-100 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                          {t("mapping.deleteGroup")}
                        </button>
                      </div>
                    </div>

                    {child.fields.length === 0 ? (
                      <div className="border-t border-coral-tree-200 px-6 py-2 text-xs text-coral-tree-500">{t("mapping.emptySubgroupHint")}</div>
                    ) : null}

                    {child.fields.some((f) => f.is_repeater) ? (
                      <div className="bg-amber-50/30 p-4 border-t border-coral-tree-200">
                        {((Array.isArray(values[child.fullPath]) ? values[child.fullPath] : []) as Record<string, unknown>[]).map((item, index) => (
                          <div key={index} className="mb-4 rounded-xl border border-amber-200/60 bg-white p-0 shadow-sm relative overflow-hidden">
                            <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 flex items-center justify-between">
                              <span className="text-xs font-semibold text-amber-800">Bản ghi #{index + 1}</span>
                              <button
                                onClick={() => removeRepeaterItem(child.fullPath, index)}
                                className="p-1 text-red-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                                title="Xóa bản ghi"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="flex flex-col">
                              <SortableContext items={child.fields.map((f) => `${f.field_key}___${index}`)} strategy={verticalListSortingStrategy}>
                                {child.fields.map((field) => (
                                  // STT in repeater is auto-managed, keep value read-only.
                                  <FieldRow
                                    key={`${field.field_key}___${index}`}
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
                                  />
                                ))}
                              </SortableContext>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addRepeaterItem(child.fullPath)}
                          className="flex items-center gap-1.5 ml-0 rounded border border-dashed border-amber-300 bg-amber-50/50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 hover:border-amber-400 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Thêm bản ghi {child.subgroup || t("mapping.groupPathRoot")}
                        </button>
                      </div>
                    ) : (
                      <SortableContext items={child.fields.map((f) => f.field_key)} strategy={verticalListSortingStrategy}>
                        {child.fields.map((field, indexInGroup) => {
                          const formulaAllowed =
                            field.type === "number" ||
                            field.type === "percent" ||
                            field.type === "date" ||
                            field.type === "text";
                          return (
                            <FieldRow
                              key={field.field_key}
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
                            />
                          );
                        })}
                      </SortableContext>
                    )}
                  </div>
                ))
              : null}
          </div>
        ))}
      </div>
    </DndContext>
  );
}

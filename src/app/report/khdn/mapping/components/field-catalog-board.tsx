import { memo } from "react";
import { Plus, ChevronUp, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { DndContext, closestCenter, type DragEndEvent, type SensorDescriptor, type SensorOptions } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Group, Panel, Separator } from "react-resizable-panels";
import type { CatalogViewData, CatalogGroupActions, CatalogFieldActions } from "../types";
import { FieldCatalogToolbar } from "./field-catalog-toolbar";
import { FieldCatalogGroupSection } from "./field-catalog-group-section";
import type { GroupedTreeNode } from "@/core/use-cases/mapping-engine";

type FieldCatalogBoardProps = {
  t: (key: string) => string;
  sensors: SensorDescriptor<SensorOptions>[];
  onDragEnd: (event: DragEndEvent) => void;
  groupedFieldTree: GroupedTreeNode[];
  hasContext: boolean;
  parentGroups: string[];
  collapsedParentGroups: string[];
  data: CatalogViewData;
  groupActions: CatalogGroupActions;
  fieldActions: CatalogFieldActions;
};

export const FieldCatalogBoard = memo(function FieldCatalogBoard({
  t,
  sensors,
  onDragEnd,
  groupedFieldTree,
  hasContext,
  parentGroups,
  collapsedParentGroups,
  data,
  groupActions,
  fieldActions,
}: FieldCatalogBoardProps) {
  const { collapseAllGroups, expandAllGroups, onOpenAddFieldModal, openCreateSubgroupModal, toggleParentCollapse } = groupActions;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis]}>
      <motion.div
        key={data.fieldCatalog.map((f) => f.field_key).join(",")}
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
              <FieldCatalogToolbar
                t={t}
                parentGroups={parentGroups}
                collapsedParentGroups={collapsedParentGroups}
                collapseAllGroups={collapseAllGroups}
                expandAllGroups={expandAllGroups}
              />

              {/* Scrollable group chip list */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2.5">
                {groupedFieldTree.length > 0 && (
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
                            {collapsedParentGroups.includes(node.parent)
                              ? <ChevronDown className="h-3 w-3 shrink-0" />
                              : <ChevronUp className="h-3 w-3 shrink-0" />}
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
                        {!collapsedParentGroups.includes(node.parent) &&
                          node.children.map((child) => (
                            <div key={child.fullPath} className="flex flex-wrap gap-1 pl-2">
                              <span className="rounded-full border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:text-slate-300">
                                {child.subgroup || t("mapping.groupPathRoot")}
                              </span>
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Panel>

          <Separator
            className="group relative hidden w-3 shrink-0 cursor-col-resize items-center justify-center bg-transparent outline-none md:flex"
            aria-label="Resize panels"
          >
            <div className="h-full w-px rounded-full bg-slate-200/70 transition-colors group-hover:bg-violet-300/80 group-focus-visible:bg-violet-400 group-data-[resize-handle-state=drag]:bg-violet-500" />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-2 -translate-x-1/2 rounded-full bg-violet-100/0 transition-colors group-hover:bg-violet-100/70 group-focus-visible:bg-violet-100/80 group-data-[resize-handle-state=drag]:bg-violet-200/80" />
          </Separator>

          {/* Right column: Field rows */}
          <Panel minSize="58%" className="min-w-0">
            <div className="min-w-0 h-full min-h-0 overflow-y-auto overflow-x-hidden p-3">
              {/* Empty state */}
              {groupedFieldTree.length === 0 && (
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
              )}

              {/* Group sections */}
              {groupedFieldTree.map((node) => (
                <FieldCatalogGroupSection
                  key={node.parent}
                  node={node}
                  t={t}
                  collapsedParentGroups={collapsedParentGroups}
                  data={data}
                  groupActions={groupActions}
                  fieldActions={fieldActions}
                />
              ))}
            </div>
          </Panel>
        </Group>
      </motion.div>
    </DndContext>
  );
});

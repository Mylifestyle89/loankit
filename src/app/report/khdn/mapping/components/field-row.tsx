import { memo, useCallback, useMemo, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { useFieldUsageStore } from "../stores/use-field-usage-store";
import {
    formatNumberVnDisplay,
    formatPercentVnDisplay,
    toDateInputValue,
    type TypeLabelMap,
} from "../helpers";
import type { ExtractSuggestionSource } from "../types";
import { FieldRowDisplay } from "./field-row-display";
import { FieldRowControls } from "./field-row-controls";

export type FieldRowProps = {
    field: FieldCatalogItem;
    value: unknown;
    showTechnicalKeys: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
    typeLabels: TypeLabelMap;
    columnValuePlaceholder: string;
    typeHintNumber: string;
    typeHintPercent: string;
    typeHintTable: string;
    tablePasteHint: string;
    moveUpTitle: string;
    moveDownTitle: string;
    changeGroupTitle: string;
    deleteFieldTitle: string;
    onManualChange: (field: FieldCatalogItem, rawValue: string) => void;
    onFieldLabelChange: (fieldKey: string, labelVi: string) => void;
    onFieldTypeChange: (fieldKey: string, type: FieldCatalogItem["type"]) => void;
    onMoveField: (fieldKey: string, direction: "up" | "down") => void;
    onOpenChangeGroupModal: (fieldKey: string) => void;
    onDeleteField: (fieldKey: string) => void;
    dndId?: string;
    valueReadOnly?: boolean;
    /** Chỉ số, phần trăm, ngày mới hiện nút công thức */
    formulaAllowed?: boolean;
    hasFormula?: boolean;
    onOpenFormula?: () => void;
    sampleData?: string;
    confidenceScore?: number;
    ocrSuggestion?: {
        proposedValue: string;
        confidenceScore: number;
        status: "pending" | "accepted" | "declined";
        source?: ExtractSuggestionSource;
    };
    onAcceptOcrSuggestion?: (fieldKey: string) => void;
    onDeclineOcrSuggestion?: (fieldKey: string) => void;
};

export const FieldRow = memo(function FieldRow({
    field,
    value,
    showTechnicalKeys,
    typeLabels,
    columnValuePlaceholder,
    typeHintNumber,
    typeHintPercent,
    typeHintTable,
    tablePasteHint,
    changeGroupTitle,
    deleteFieldTitle,
    onManualChange,
    onFieldLabelChange,
    onFieldTypeChange,
    onOpenChangeGroupModal,
    onDeleteField,
    dndId,
    valueReadOnly = false,
    formulaAllowed = false,
    hasFormula = false,
    onOpenFormula,
    sampleData = "",
    confidenceScore = 0,
    ocrSuggestion,
    onAcceptOcrSuggestion,
    onDeclineOcrSuggestion,
}: FieldRowProps) {
    // Reverse sync: which templates use this field
    const templateUsage = useFieldUsageStore((s) => s.usageMap[field.field_key]);

    const sortableId = dndId || field.field_key;
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: sortableId });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 2 : 1,
        position: isDragging ? ("relative" as const) : ("static" as const),
    };

    const displayText = useMemo(() => {
        if (field.type === "number") return formatNumberVnDisplay(value);
        if (field.type === "percent") return formatPercentVnDisplay(value);
        if (field.type === "date") return toDateInputValue(value);
        return value === null || value === undefined ? "" : String(value);
    }, [field.type, value]);

    const [localText, setLocalText] = useState(displayText);
    const [isFocused, setIsFocused] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isReadOnly = valueReadOnly || hasFormula;
    const readOnlyClassName = isReadOnly
        ? "cursor-not-allowed bg-violet-50/30 dark:bg-white/[0.04] text-zinc-500 hover:border-transparent focus:border-transparent focus:ring-0"
        : "";

    const inputClassName =
        "h-8 w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm transition-colors placeholder:text-zinc-700 hover:border-zinc-200 focus:border-violet-500 focus:bg-white dark:focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-violet-500";

    const textareaClassName =
        "min-h-[80px] w-full rounded border border-transparent bg-transparent px-2 py-1.5 font-mono text-sm transition-colors whitespace-pre placeholder:text-zinc-700 hover:border-zinc-200 focus:border-violet-500 focus:bg-white dark:focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-violet-500";

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (isReadOnly) return;
        const newVal = e.target.value;
        setLocalText(newVal);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => { onManualChange(field, newVal); }, 400);
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (isReadOnly) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        onManualChange(field, localText);
    };

    const handleFocus = () => {
        setLocalText(displayText);
        setIsFocused(true);
    };

    const COLS = ["label", "value", "type"] as const;
    type NavCol = typeof COLS[number];

    const navigateField = useCallback(
        (e: React.KeyboardEvent<HTMLElement>, col: NavCol) => {
            const key = e.key;
            const colIdx = COLS.indexOf(col);

            if (key === "ArrowUp" || key === "ArrowDown" || key === "Enter") {
                if (col === "type" && (key === "ArrowUp" || key === "ArrowDown")) return;
                e.preventDefault();
                const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-field-col="${col}"]`));
                const idx = all.indexOf(e.currentTarget as HTMLElement);
                const target = key === "ArrowUp" ? all[idx - 1] : all[idx + 1];
                target?.focus();
                return;
            }

            if (key === "ArrowLeft" && colIdx > 0) {
                const input = e.currentTarget as HTMLInputElement;
                if ((input.selectionStart ?? 0) === 0 && (input.selectionEnd ?? 0) === 0) {
                    e.preventDefault();
                    const row = input.closest("[data-field-row]");
                    row?.querySelector<HTMLElement>(`[data-field-col="${COLS[colIdx - 1]}"]`)?.focus();
                }
                return;
            }

            if (key === "ArrowRight" && colIdx < COLS.length - 1) {
                const input = e.currentTarget as HTMLInputElement;
                const len = (input as HTMLInputElement).value?.length ?? 0;
                if ((input.selectionStart ?? len) === len && (input.selectionEnd ?? len) === len) {
                    e.preventDefault();
                    const row = input.closest("[data-field-row]");
                    row?.querySelector<HTMLElement>(`[data-field-col="${COLS[colIdx + 1]}"]`)?.focus();
                }
            }
        },
        [],
    );

    // Value input — varies by field type
    const valueInput =
        field.type === "date" ? (
            <input
                type="text"
                value={isFocused ? localText : displayText}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                onKeyDown={(e) => navigateField(e, "value")}
                data-field-col="value"
                aria-label={field.label_vi}
                className={`${inputClassName} ${readOnlyClassName}`}
                readOnly={isReadOnly}
                placeholder="dd/mm/yyyy"
                inputMode="numeric"
            />
        ) : field.type === "number" ? (
            <input
                value={isFocused ? localText : displayText}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                onKeyDown={(e) => navigateField(e, "value")}
                data-field-col="value"
                inputMode="decimal"
                className={`${inputClassName} ${readOnlyClassName}`}
                placeholder={typeHintNumber}
                readOnly={isReadOnly}
            />
        ) : field.type === "percent" ? (
            <input
                value={isFocused ? localText : displayText}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                onKeyDown={(e) => navigateField(e, "value")}
                data-field-col="value"
                inputMode="decimal"
                className={`${inputClassName} ${readOnlyClassName}`}
                placeholder={typeHintPercent}
                readOnly={isReadOnly}
            />
        ) : field.type === "table" ? (
            <div className="space-y-1">
                <textarea
                    value={isFocused ? localText : displayText}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onFocus={handleFocus}
                    className={`${textareaClassName} ${readOnlyClassName}`}
                    placeholder={typeHintTable}
                    spellCheck={false}
                    readOnly={isReadOnly}
                />
                <p className="text-[10px] font-medium text-zinc-700 px-2">{tablePasteHint}</p>
            </div>
        ) : (
            <input
                value={isFocused ? localText : displayText}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                onKeyDown={(e) => navigateField(e, "value")}
                data-field-col="value"
                className={`${inputClassName} ${readOnlyClassName}`}
                placeholder={columnValuePlaceholder}
                readOnly={isReadOnly}
            />
        );

    const hasPendingOcr = ocrSuggestion?.status === "pending";

    return (
        <div
            ref={setNodeRef}
            style={style}
            data-field-row={field.field_key}
            className={`group min-w-0 grid grid-cols-1 gap-2 border-t border-zinc-100 dark:border-white/[0.06] px-3 py-2 text-sm transition-colors md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(110px,140px)_auto] ${
                isDragging
                    ? "bg-violet-50/30 dark:bg-white/[0.06] opacity-80 shadow-md ring-1 ring-zinc-200"
                    : hasPendingOcr
                    ? "bg-amber-50/60 dark:bg-amber-500/10 hover:bg-amber-50/80 dark:hover:bg-amber-500/15"
                    : "bg-white dark:bg-transparent hover:bg-violet-50/30 dark:hover:bg-white/[0.04]"
            }`}
        >
            {/* Col 1: drag handle + label + metadata */}
            <div className="flex min-w-0 items-start gap-2 pt-0.5">
                <div className="mt-1 flex flex-col gap-0 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                        type="button"
                        {...attributes}
                        {...listeners}
                        className="flex h-5 w-5 cursor-grab items-center justify-center rounded text-zinc-700 hover:bg-violet-100 hover:text-violet-900 active:cursor-grabbing"
                        title="Kéo để di chuyển"
                    >
                        <GripVertical className="h-4 w-4" />
                    </button>
                </div>
                <FieldRowDisplay
                    field={field}
                    showTechnicalKeys={showTechnicalKeys}
                    sampleData={sampleData}
                    confidenceScore={confidenceScore}
                    templateUsage={templateUsage}
                    ocrSuggestion={ocrSuggestion}
                    onFieldLabelChange={onFieldLabelChange}
                    onAcceptOcrSuggestion={onAcceptOcrSuggestion}
                    onDeclineOcrSuggestion={onDeclineOcrSuggestion}
                    navigateField={navigateField}
                />
            </div>

            {/* Col 2: value input */}
            <div className="min-w-0 w-full pt-1">
                {valueInput}
            </div>

            {/* Col 3 + 4: type selector + action buttons */}
            <FieldRowControls
                field={field}
                typeLabels={typeLabels}
                formulaAllowed={formulaAllowed}
                hasFormula={hasFormula}
                changeGroupTitle={changeGroupTitle}
                deleteFieldTitle={deleteFieldTitle}
                onFieldTypeChange={onFieldTypeChange}
                onOpenChangeGroupModal={onOpenChangeGroupModal}
                onDeleteField={onDeleteField}
                onOpenFormula={onOpenFormula}
                navigateField={navigateField}
            />
        </div>
    );
});

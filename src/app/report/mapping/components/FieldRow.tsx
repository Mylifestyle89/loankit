import { memo, useMemo, useRef, useState } from "react";
import { Pencil, Trash2, GripVertical, FunctionSquare } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import {
    formatNumberVnDisplay,
    formatPercentVnDisplay,
    toDateInputValue,
    toBusinessType,
    toInternalType,
    TypeLabelMap,
} from "../helpers";

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
}: FieldRowProps) {
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (isReadOnly) return;
        const newVal = e.target.value;
        setLocalText(newVal);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            onManualChange(field, newVal);
        }, 400);
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

    const inputClassName =
        "h-8 w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm transition-colors placeholder:text-coral-tree-700 hover:border-coral-tree-300 focus:border-coral-tree-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-coral-tree-500";

    const textareaClassName =
        "min-h-[80px] w-full rounded border border-transparent bg-transparent px-2 py-1.5 font-mono text-sm transition-colors whitespace-pre placeholder:text-coral-tree-700 hover:border-coral-tree-300 focus:border-coral-tree-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-coral-tree-500";

    const isReadOnly = valueReadOnly || hasFormula;
    const readOnlyClassName = isReadOnly
        ? "cursor-not-allowed bg-coral-tree-50 text-coral-tree-600 hover:border-transparent focus:border-transparent focus:ring-0"
        : "";

    const valueInput =
        field.type === "date" ? (
            <input
                type="text"
                value={isFocused ? localText : displayText}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
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
                <p className="text-[10px] font-medium text-coral-tree-700 px-2">{tablePasteHint}</p>
            </div>
        ) : (
            <input
                value={isFocused ? localText : displayText}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                className={`${inputClassName} ${readOnlyClassName}`}
                placeholder={columnValuePlaceholder}
                readOnly={isReadOnly}
            />
        );

    return (
        <div ref={setNodeRef} style={style} className={`group grid grid-cols-[minmax(260px,1fr)_minmax(360px,2fr)_160px_64px] items-start gap-2 border-t border-coral-tree-100 px-4 py-1.5 text-sm transition-colors ${isDragging ? "bg-coral-tree-50 opacity-80 shadow-md ring-1 ring-coral-tree-300" : "bg-white hover:bg-coral-tree-50"}`}>
            <div className="flex items-start gap-2 pt-0.5">
                <div className="mt-1 flex flex-col gap-0 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                        type="button"
                        {...attributes}
                        {...listeners}
                        className="flex h-5 w-5 cursor-grab items-center justify-center rounded text-coral-tree-700 hover:bg-coral-tree-200 hover:text-coral-tree-900 active:cursor-grabbing"
                        title="Kéo để di chuyển"
                    >
                        <GripVertical className="h-4 w-4" />
                    </button>
                </div>
                <div className="flex-1">
                    <input
                        value={field.label_vi}
                        onChange={(e) => onFieldLabelChange(field.field_key, e.target.value)}
                        aria-label="Tên hiển thị field"
                        className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-coral-tree-800 transition-colors hover:border-coral-tree-300 focus:border-coral-tree-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-coral-tree-500"
                    />
                    {showTechnicalKeys ? (
                        <p className="mt-0.5 px-2 font-mono text-[10px] text-coral-tree-700">{field.field_key}</p>
                    ) : null}
                </div>
            </div>
            <div className="w-full pt-1">{valueInput}</div>
            <div className="w-full pt-1">
                <select
                    value={toBusinessType(field.type)}
                    onChange={(e) =>
                        onFieldTypeChange(
                            field.field_key,
                            toInternalType(e.target.value as "string" | "number" | "percent" | "date" | "table")
                        )
                    }
                    aria-label={`Kiểu dữ liệu cho ${field.label_vi}`}
                    className="cursor-pointer h-8 w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-coral-tree-800 transition-colors hover:border-coral-tree-300 focus:border-coral-tree-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-coral-tree-500"
                >
                    <option value="string">{typeLabels.string}</option>
                    <option value="number">{typeLabels.number}</option>
                    <option value="percent">{typeLabels.percent}</option>
                    <option value="date">{typeLabels.date}</option>
                    <option value="table">{typeLabels.table}</option>
                </select>
            </div>
            <div className="flex items-center justify-center gap-1 pt-1 opacity-0 transition-opacity group-hover:opacity-100">
                {formulaAllowed && onOpenFormula ? (
                    <button
                        type="button"
                        onClick={onOpenFormula}
                        className={`rounded p-1 ${hasFormula ? "bg-amber-100 text-amber-800" : "text-coral-tree-700 hover:bg-coral-tree-200 hover:text-coral-tree-900"}`}
                        title={hasFormula ? "Sửa công thức" : "Nhập công thức"}
                    >
                        <FunctionSquare className="h-3.5 w-3.5" />
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={() => onOpenChangeGroupModal(field.field_key)}
                    className="rounded p-1 text-coral-tree-700 hover:bg-coral-tree-200 hover:text-coral-tree-900"
                    title={changeGroupTitle}
                >
                    <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    onClick={() => onDeleteField(field.field_key)}
                    className="rounded p-1 text-coral-tree-700 hover:bg-red-50 hover:text-red-700"
                    title={deleteFieldTitle}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
});

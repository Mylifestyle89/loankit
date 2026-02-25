import { memo, useMemo, useRef, useState } from "react";
import { Pencil, Trash2, GripVertical, FunctionSquare, Check, X } from "lucide-react";
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
    sampleData?: string;
    confidenceScore?: number;
    ocrSuggestion?: { proposedValue: string; confidenceScore: number; status: "pending" | "accepted" | "declined" };
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

    const hasPendingOcr = ocrSuggestion?.status === "pending";

    return (
        <div ref={setNodeRef} style={style} className={`group min-w-0 grid grid-cols-1 gap-2 border-t border-coral-tree-100 px-3 py-2 text-sm transition-colors md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(110px,140px)_auto] ${isDragging ? "bg-coral-tree-50 opacity-80 shadow-md ring-1 ring-coral-tree-300" : hasPendingOcr ? "bg-amber-50/60 hover:bg-amber-50/80" : "bg-white hover:bg-coral-tree-50"}`}>
            <div className="flex min-w-0 items-start gap-2 pt-0.5">
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
                <div className="min-w-0 flex-1">
                    <input
                        value={field.label_vi}
                        onChange={(e) => onFieldLabelChange(field.field_key, e.target.value)}
                        aria-label="Tên hiển thị field"
                        className="w-full truncate rounded border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-coral-tree-800 transition-colors hover:border-coral-tree-300 focus:border-coral-tree-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-coral-tree-500"
                        title={field.label_vi}
                    />
                    {showTechnicalKeys ? (
                        <p className="mt-0.5 px-2 font-mono text-[10px] text-coral-tree-700">{field.field_key}</p>
                    ) : null}
                    <div className="mt-0.5 flex items-center justify-between gap-2 px-2">
                        <p className="truncate text-[10px] text-zinc-400" title={sampleData || "Chưa có dữ liệu mẫu"}>
                            Sample Data: {sampleData || "—"}
                        </p>
                        <span
                            className={`inline-flex flex-shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${confidenceScore >= 90
                                    ? "bg-emerald-100 text-emerald-700"
                                    : confidenceScore >= 60
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-rose-100 text-rose-700"
                                }`}
                            title="Confidence Score (heuristic)"
                        >
                            {confidenceScore}%
                        </span>
                    </div>
                </div>
            </div>
            <div className="min-w-0 w-full pt-1">
                {valueInput}
                {hasPendingOcr ? (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 px-1">
                        <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            Pending Review ({Math.round((ocrSuggestion?.confidenceScore ?? 0) * 100)}%)
                        </span>
                        <button
                            type="button"
                            onClick={() => onAcceptOcrSuggestion?.(field.field_key)}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                        >
                            <Check className="h-3 w-3" />
                            Accept Suggestion
                        </button>
                        <button
                            type="button"
                            onClick={() => onDeclineOcrSuggestion?.(field.field_key)}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                        >
                            <X className="h-3 w-3" />
                            Decline
                        </button>
                    </div>
                ) : null}
            </div>
            <div className="min-w-0 w-full pt-1">
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

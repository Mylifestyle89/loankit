import { memo, useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, Pencil, Trash2 } from "lucide-react";
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
};

export const FieldRow = memo(function FieldRow({
    field,
    value,
    showTechnicalKeys,
    canMoveUp,
    canMoveDown,
    typeLabels,
    columnValuePlaceholder,
    typeHintNumber,
    typeHintPercent,
    typeHintTable,
    tablePasteHint,
    moveUpTitle,
    moveDownTitle,
    changeGroupTitle,
    deleteFieldTitle,
    onManualChange,
    onFieldLabelChange,
    onFieldTypeChange,
    onMoveField,
    onOpenChangeGroupModal,
    onDeleteField,
}: FieldRowProps) {
    const [localText, setLocalText] = useState("");
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) {
            if (field.type === "number") setLocalText(formatNumberVnDisplay(value));
            else if (field.type === "percent") setLocalText(formatPercentVnDisplay(value));
            else if (field.type === "date") setLocalText(toDateInputValue(value));
            else setLocalText(value === null || value === undefined ? "" : String(value));
        }
    }, [value, field.type, isFocused]);

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newVal = e.target.value;
        setLocalText(newVal);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            onManualChange(field, newVal);
        }, 400);
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        onManualChange(field, localText);
    };

    const inputClassName =
        "h-8 w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm transition-colors placeholder:text-coral-tree-400 hover:border-coral-tree-300 focus:border-coral-tree-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-coral-tree-500";

    const textareaClassName =
        "min-h-[80px] w-full rounded border border-transparent bg-transparent px-2 py-1.5 font-mono text-sm transition-colors whitespace-pre placeholder:text-coral-tree-400 hover:border-coral-tree-300 focus:border-coral-tree-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-coral-tree-500";

    const valueInput =
        field.type === "date" ? (
            <input
                type="date"
                value={localText}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={() => setIsFocused(true)}
                className={inputClassName}
            />
        ) : field.type === "number" ? (
            <input
                value={localText}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={() => setIsFocused(true)}
                inputMode="decimal"
                className={inputClassName}
                placeholder={typeHintNumber}
            />
        ) : field.type === "percent" ? (
            <input
                value={localText}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={() => setIsFocused(true)}
                inputMode="decimal"
                className={inputClassName}
                placeholder={typeHintPercent}
            />
        ) : field.type === "table" ? (
            <div className="space-y-1">
                <textarea
                    value={localText}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onFocus={() => setIsFocused(true)}
                    className={textareaClassName}
                    placeholder={typeHintTable}
                    spellCheck={false}
                />
                <p className="text-[10px] font-medium text-coral-tree-400 px-2">{tablePasteHint}</p>
            </div>
        ) : (
            <input
                value={localText}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={() => setIsFocused(true)}
                className={inputClassName}
                placeholder={columnValuePlaceholder}
            />
        );

    return (
        <div className="group grid grid-cols-[minmax(260px,1fr)_minmax(360px,2fr)_160px_64px] items-start gap-2 border-t border-coral-tree-100 bg-white px-4 py-1.5 text-sm transition-colors hover:bg-coral-tree-50">
            <div className="flex items-start gap-2 pt-0.5">
                <div className="mt-1 flex flex-col gap-0 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                        type="button"
                        onClick={() => onMoveField(field.field_key, "up")}
                        disabled={!canMoveUp}
                        className="flex h-4 w-4 items-center justify-center rounded text-coral-tree-400 hover:bg-coral-tree-200 hover:text-coral-tree-700 disabled:opacity-30"
                        title={moveUpTitle}
                    >
                        <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onMoveField(field.field_key, "down")}
                        disabled={!canMoveDown}
                        className="flex h-4 w-4 items-center justify-center rounded text-coral-tree-400 hover:bg-coral-tree-200 hover:text-coral-tree-700 disabled:opacity-30"
                        title={moveDownTitle}
                    >
                        <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                </div>
                <div className="flex-1">
                    <input
                        value={field.label_vi}
                        onChange={(e) => onFieldLabelChange(field.field_key, e.target.value)}
                        className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-coral-tree-800 transition-colors hover:border-coral-tree-300 focus:border-coral-tree-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-coral-tree-500"
                    />
                    {showTechnicalKeys ? (
                        <p className="mt-0.5 px-2 font-mono text-[10px] text-coral-tree-400">{field.field_key}</p>
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
                    className="cursor-pointer h-8 w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-coral-tree-600 transition-colors hover:border-coral-tree-300 focus:border-coral-tree-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-coral-tree-500"
                >
                    <option value="string">{typeLabels.string}</option>
                    <option value="number">{typeLabels.number}</option>
                    <option value="percent">{typeLabels.percent}</option>
                    <option value="date">{typeLabels.date}</option>
                    <option value="table">{typeLabels.table}</option>
                </select>
            </div>
            <div className="flex items-center justify-center gap-1 pt-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                    type="button"
                    onClick={() => onOpenChangeGroupModal(field.field_key)}
                    className="rounded p-1 text-coral-tree-400 hover:bg-coral-tree-200 hover:text-coral-tree-800"
                    title={changeGroupTitle}
                >
                    <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    onClick={() => onDeleteField(field.field_key)}
                    className="rounded p-1 text-coral-tree-400 hover:bg-red-50 hover:text-red-600"
                    title={deleteFieldTitle}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
});

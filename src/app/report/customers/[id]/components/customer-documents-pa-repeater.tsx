"use client";

import React from "react";
import { Trash2, Plus } from "lucide-react";
import { inputCls } from "./shared-form-styles";
import { SmartField } from "@/components/smart-field";
import { DOCUMENT_PA_TYPES, DOCUMENT_PA_LABELS, type DocumentPAEntry } from "./customer-documents-pa-config";

export type { DocumentPAEntry };

export function DocumentPARow({
  doc, index, onChange, onRemove,
}: {
  doc: DocumentPAEntry;
  index: number;
  onChange: (idx: number, patch: Partial<DocumentPAEntry>) => void;
  onRemove: (idx: number) => void;
}) {
  const set = (key: keyof DocumentPAEntry, val: string) => onChange(index, { [key]: val });

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-white/[0.07] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-500">Tài liệu PA #{index + 1}</span>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10"
        >
          <Trash2 className="h-3 w-3 text-red-400" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block col-span-2 sm:col-span-1">
          <span className="text-xs text-zinc-500">{DOCUMENT_PA_LABELS.document_type}</span>
          <SmartField
            fieldKey="customer.document_type"
            value={doc.document_type}
            onChange={(val) => set("document_type", val)}
            className={inputCls}
          />
        </label>
        <label className="block col-span-2 sm:col-span-1">
          <span className="text-xs text-zinc-500">{DOCUMENT_PA_LABELS.number}</span>
          <input
            value={doc.number}
            onChange={(e) => set("number", e.target.value)}
            className={inputCls}
            placeholder="VD: 42033078A"
          />
        </label>
        <label className="block col-span-2">
          <span className="text-xs text-zinc-500">{DOCUMENT_PA_LABELS.issuing_authority}</span>
          <input
            value={doc.issuing_authority}
            onChange={(e) => set("issuing_authority", e.target.value)}
            className={inputCls}
            placeholder="VD: Phòng Tài chính Kế hoạch UBND TP Đà Lạt"
          />
        </label>
        <label className="block col-span-2 sm:col-span-1">
          <span className="text-xs text-zinc-500">{DOCUMENT_PA_LABELS.issue_date}</span>
          <input
            value={doc.issue_date}
            onChange={(e) => set("issue_date", e.target.value)}
            className={inputCls}
            placeholder="DD/MM/YYYY"
          />
        </label>
        <label className="block col-span-2 sm:col-span-1">
          <span className="text-xs text-zinc-500">{DOCUMENT_PA_LABELS.notes}</span>
          <input
            value={doc.notes}
            onChange={(e) => set("notes", e.target.value)}
            className={inputCls}
            placeholder="Ghi chú (tuỳ chọn)"
          />
        </label>
      </div>
    </div>
  );
}

export function DocumentPARepeater({
  documents,
  onChange,
}: {
  documents: DocumentPAEntry[];
  onChange: (docs: DocumentPAEntry[]) => void;
}) {
  function handleChange(idx: number, patch: Partial<DocumentPAEntry>) {
    const next = [...documents];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }

  function handleRemove(idx: number) {
    onChange(documents.filter((_, i) => i !== idx));
  }

  function handleAdd() {
    onChange([
      ...documents,
      { document_type: "", number: "", issuing_authority: "", issue_date: "", notes: "" },
    ]);
  }

  return (
    <div className="space-y-3">
      {documents.map((doc, idx) => (
        <DocumentPARow key={idx} doc={doc} index={idx} onChange={handleChange} onRemove={handleRemove} />
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline"
      >
        <Plus className="h-3 w-3" /> Thêm tài liệu PA
      </button>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { inputCls, btnCls } from "./shared-form-styles";
import { SmartField } from "@/components/smart-field";
import { DropdownOptionsProvider } from "@/lib/hooks/dropdown-options-context";
import { DocumentScannerDialog } from "./document-scanner-dialog";

type RelatedPersonItem = {
  id: string;
  name: string;
  id_number: string | null;
  address: string | null;
  relation_type: string | null;
  agribank_debt: string | null;
  agribank_branch: string | null;
};

const FIELDS: { key: keyof Omit<RelatedPersonItem, "id">; label: string }[] = [
  { key: "name", label: "Tên tổ chức/Cá nhân" },
  { key: "id_number", label: "Số ĐKKD/CMND" },
  { key: "address", label: "Địa chỉ" },
  { key: "relation_type", label: "Mối liên quan" },
  { key: "agribank_debt", label: "Dư nợ tại Agribank" },
  { key: "agribank_branch", label: "Chi nhánh Agribank" },
];


function RelatedPersonForm({
  customerId,
  initial,
  onSaved,
  onCancel,
}: {
  customerId: string;
  initial?: RelatedPersonItem;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const obj: Record<string, string> = {};
    for (const f of FIELDS) obj[f.key] = (initial as Record<string, string | null> | undefined)?.[f.key] ?? "";
    return obj;
  });
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  async function handleSave() {
    if (!form.name?.trim()) return;
    setSaving(true);
    setError("");
    try {
      const isEdit = !!(initial?.id);
      const url = isEdit
        ? `/api/customers/${customerId}/related-persons/${initial.id}`
        : `/api/customers/${customerId}/related-persons`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? "Lỗi không xác định"); return; }
      onSaved();
    } catch { setError("Lỗi kết nối"); } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-primary-200 dark:border-primary-500/20 bg-primary-50/30 dark:bg-primary-500/5 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {f.label}{f.key === "name" ? " *" : ""}
            </span>
            <SmartField fieldKey={`related_person.${f.key}`} value={form[f.key] ?? ""} onChange={(val) => set(f.key, val)} className={inputCls} />
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={handleSave} disabled={saving} className={`${btnCls} bg-primary-500 text-white shadow-sm`}>
          {saving ? "..." : initial ? "Cập nhật" : "Thêm"}
        </button>
        <button type="button" onClick={onCancel} className={`${btnCls} border border-zinc-200 dark:border-white/[0.09]`}>
          Hủy
        </button>
      </div>
    </div>
  );
}

function RelatedPersonRow({
  item,
  customerId,
  onRefresh,
}: {
  item: RelatedPersonItem;
  customerId: string;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Xóa người liên quan này?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/related-persons/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) { alert(data.error ?? "Xóa thất bại"); return; }
      onRefresh();
    } finally {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <RelatedPersonForm
        customerId={customerId}
        initial={item}
        onSaved={() => { setEditing(false); onRefresh(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="border border-zinc-200 dark:border-white/[0.07] rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs flex-1">
          {FIELDS.map((f) => {
            const val = (item as unknown as Record<string, string | null>)[f.key];
            if (!val) return null;
            return (
              <div key={f.key} className="flex gap-2">
                <span className="text-zinc-500 dark:text-zinc-400">{f.label}:</span>
                <span className="font-medium">{val}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-1 shrink-0">
          <button type="button" onClick={() => setEditing(true)} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-white/[0.05]">
            <Pencil className="h-3.5 w-3.5 text-zinc-400" />
          </button>
          <button type="button" onClick={handleDelete} disabled={deleting} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10">
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function CustomerRelatedPersonSection({ customerId }: { customerId: string }) {
  const [items, setItems] = useState<RelatedPersonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanPrefill, setScanPrefill] = useState<Partial<RelatedPersonItem> | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/customers/${customerId}/related-persons`);
    const data = await res.json();
    if (data.ok) setItems(data.items ?? []);
    setLoading(false);
  }, [customerId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
      </div>
    );
  }

  return (
    <DropdownOptionsProvider prefix="related_person.">
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Người liên quan ({items.length})</h3>
        <div className="flex gap-2">
          <button type="button" onClick={() => setScannerOpen(true)}
            className={`${btnCls} inline-flex items-center gap-1.5 border border-primary-200 dark:border-primary-500/30 bg-primary-100 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-100`}>
            📷 Scan CCCD
          </button>
          <button type="button" onClick={() => { setScanPrefill(undefined); setShowForm(true); }}
            className={`${btnCls} inline-flex items-center gap-1.5 bg-primary-500 text-white shadow-sm shadow-primary-500/25 hover:brightness-110`}>
            <Plus className="h-3.5 w-3.5" /> Thêm
          </button>
        </div>
      </div>

      {showForm && (
        <RelatedPersonForm
          customerId={customerId}
          initial={scanPrefill as RelatedPersonItem | undefined}
          onSaved={() => { setShowForm(false); setScanPrefill(undefined); void load(); }}
          onCancel={() => { setShowForm(false); setScanPrefill(undefined); }}
        />
      )}

      <DocumentScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        allowedTypes={["cccd"]}
        onConfirm={({ fields }) => {
          setScanPrefill({
            name: fields.full_name ?? "",
            id_number: fields.cccd_number ?? "",
            address: fields.place_of_residence ?? "",
          } as Partial<RelatedPersonItem> as RelatedPersonItem);
          setShowForm(true);
        }}
      />

      {items.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-8 text-center">
          <p className="text-sm text-zinc-400 dark:text-slate-500">Chưa có người liên quan nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <RelatedPersonRow key={item.id} item={item} customerId={customerId} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
    </DropdownOptionsProvider>
  );
}

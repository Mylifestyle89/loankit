"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { inputCls, btnCls } from "./shared-form-styles";
import { SmartField } from "@/components/smart-field";
import { DropdownOptionsProvider } from "@/lib/hooks/dropdown-options-context";
import { DocumentScannerDialog } from "./document-scanner-dialog";

type CoBorrowerItem = {
  id: string;
  title: string | null;
  full_name: string;
  id_type: string | null;
  id_number: string | null;
  id_issued_date: string | null;
  id_old: string | null;
  id_issued_place: string | null;
  birth_year: string | null;
  phone: string | null;
  current_address: string | null;
  permanent_address: string | null;
  relationship: string | null;
  agribank_debt: string | null;
  agribank_branch: string | null;
};

const FIELDS: { key: keyof Omit<CoBorrowerItem, "id">; label: string }[] = [
  { key: "title", label: "Danh xưng" },
  { key: "full_name", label: "Họ và tên" },
  { key: "id_type", label: "Loại giấy tờ tùy thân" },
  { key: "id_number", label: "CMND/CCCD" },
  { key: "id_issued_date", label: "Ngày cấp" },
  { key: "id_old", label: "CMND cũ" },
  { key: "id_issued_place", label: "Nơi cấp" },
  { key: "birth_year", label: "Năm sinh" },
  { key: "phone", label: "Số điện thoại" },
  { key: "current_address", label: "Địa chỉ hiện tại" },
  { key: "permanent_address", label: "Nơi thường trú" },
  { key: "relationship", label: "Mối quan hệ với KH vay" },
  { key: "agribank_debt", label: "Dư nợ tại Agribank" },
  { key: "agribank_branch", label: "Chi nhánh Agribank" },
];


function CoBorrowerForm({
  customerId,
  initial,
  onSaved,
  onCancel,
}: {
  customerId: string;
  initial?: CoBorrowerItem;
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
    if (!form.full_name?.trim()) return;
    setSaving(true);
    setError("");
    try {
      const isEdit = !!(initial?.id);
      const url = isEdit
        ? `/api/customers/${customerId}/co-borrowers/${initial.id}`
        : `/api/customers/${customerId}/co-borrowers`;
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
    <div className="rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50/30 dark:bg-violet-500/5 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {f.label}{f.key === "full_name" ? " *" : ""}
            </span>
            <SmartField fieldKey={`co_borrower.${f.key}`} value={form[f.key] ?? ""} onChange={(val) => set(f.key, val)} className={inputCls} />
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={handleSave} disabled={saving} className={`${btnCls} bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm`}>
          {saving ? "..." : initial ? "Cập nhật" : "Thêm"}
        </button>
        <button type="button" onClick={onCancel} className={`${btnCls} border border-zinc-200 dark:border-white/[0.09]`}>
          Hủy
        </button>
      </div>
    </div>
  );
}

/** Field grouping for clean display */
const IDENTITY_KEYS = new Set(["title", "id_type", "id_number", "id_issued_date", "id_old", "id_issued_place", "birth_year"]);
const CONTACT_KEYS = new Set(["phone", "current_address", "permanent_address"]);
const RELATION_KEYS = new Set(["relationship", "agribank_debt", "agribank_branch"]);

function FieldGroup({ label, fields, item }: { label: string; fields: typeof FIELDS; item: CoBorrowerItem }) {
  const entries = fields.filter((f) => (item as unknown as Record<string, string | null>)[f.key]);
  if (entries.length === 0) return null;
  return (
    <div>
      <h5 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">{label}</h5>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {entries.map((f) => (
          <div key={f.key} className="flex flex-col gap-0.5">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{f.label}</span>
            <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200">
              {(item as unknown as Record<string, string | null>)[f.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoBorrowerRow({
  item,
  customerId,
  onRefresh,
}: {
  item: CoBorrowerItem;
  customerId: string;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Xóa người đồng vay này?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/co-borrowers/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) { alert(data.error ?? "Xóa thất bại"); return; }
      onRefresh();
    } finally {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <CoBorrowerForm
        customerId={customerId}
        initial={item}
        onSaved={() => { setEditing(false); onRefresh(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const identityFields = FIELDS.filter((f) => IDENTITY_KEYS.has(f.key));
  const contactFields = FIELDS.filter((f) => CONTACT_KEYS.has(f.key));
  const relationFields = FIELDS.filter((f) => RELATION_KEYS.has(f.key));

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] overflow-hidden">
      {/* Header: Name + actions */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-50/80 dark:bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 text-xs font-bold">
            {item.full_name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.full_name}</p>
            {item.relationship && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{item.relationship}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => setEditing(true)} className="p-1.5 rounded-md hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] transition-colors">
            <Pencil className="h-3.5 w-3.5 text-zinc-400" />
          </button>
          <button type="button" onClick={handleDelete} disabled={deleting} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
          </button>
        </div>
      </div>

      {/* Body: grouped fields */}
      <div className="px-4 py-3 space-y-4">
        <FieldGroup label="Giấy tờ tùy thân" fields={identityFields} item={item} />
        <FieldGroup label="Liên hệ & Địa chỉ" fields={contactFields} item={item} />
        <FieldGroup label="Quan hệ & Nợ" fields={relationFields} item={item} />
      </div>
    </div>
  );
}

export function CustomerCoBorrowerSection({ customerId }: { customerId: string }) {
  const [items, setItems] = useState<CoBorrowerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanPrefill, setScanPrefill] = useState<Partial<CoBorrowerItem> | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/customers/${customerId}/co-borrowers`);
    const data = await res.json();
    if (data.ok) setItems(data.items ?? []);
    setLoading(false);
  }, [customerId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  return (
    <DropdownOptionsProvider prefix="co_borrower.">
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Người đồng vay ({items.length})</h3>
        <div className="flex gap-2">
          <button type="button" onClick={() => setScannerOpen(true)}
            className={`${btnCls} inline-flex items-center gap-1.5 border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 hover:bg-violet-100`}>
            📷 Scan CCCD
          </button>
          <button type="button" onClick={() => { setScanPrefill(undefined); setShowForm(true); }}
            className={`${btnCls} inline-flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm shadow-violet-500/25 hover:brightness-110`}>
            <Plus className="h-3.5 w-3.5" /> Thêm
          </button>
        </div>
      </div>

      {showForm && (
        <CoBorrowerForm
          customerId={customerId}
          initial={scanPrefill as CoBorrowerItem | undefined}
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
            full_name: fields.full_name ?? "",
            id_number: fields.cccd_number ?? "",
            id_issued_date: fields.issued_date ?? "",
            id_issued_place: fields.issued_place ?? "",
            birth_year: fields.date_of_birth ?? "",
            permanent_address: fields.place_of_residence ?? "",
          } as Partial<CoBorrowerItem> as CoBorrowerItem);
          setShowForm(true);
        }}
      />

      {items.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-8 text-center">
          <p className="text-sm text-zinc-400 dark:text-slate-500">Chưa có người đồng vay nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <CoBorrowerRow key={item.id} item={item} customerId={customerId} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
    </DropdownOptionsProvider>
  );
}

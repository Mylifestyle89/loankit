"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { inputCls, btnCls } from "./shared-form-styles";
import { SmartField } from "@/components/smart-field";
import { DropdownOptionsProvider } from "@/lib/hooks/dropdown-options-context";

/* ── Shared field definitions ── */

type FieldDef = { key: string; label: string };

/** Keys containing monetary amounts that need thousand separators */
const MONETARY_KEYS = new Set(["debt_amount"]);

/** Format number with Vietnamese thousand separators (dots) */
function formatMonetary(key: string, value: string | null): string {
  if (!value || !MONETARY_KEYS.has(key)) return value ?? "";
  const num = Number(value.replace(/[.,\s]/g, ""));
  if (Number.isNaN(num)) return value;
  return num.toLocaleString("vi-VN");
}

const AGRIBANK_FIELDS: FieldDef[] = [
  { key: "branch_name", label: "Tại chi nhánh/PGD" },
  { key: "debt_group", label: "Nhóm nợ" },
  { key: "loan_term", label: "Thời hạn vay" },
  { key: "debt_amount", label: "Dư nợ" },
  { key: "loan_purpose", label: "Mục đích vay" },
  { key: "repayment_source", label: "Nguồn trả nợ" },
];

const OTHER_FIELDS: FieldDef[] = [
  { key: "institution_name", label: "Tên TCTD" },
  { key: "debt_group", label: "Nhóm nợ" },
  { key: "loan_term", label: "Thời hạn vay" },
  { key: "debt_amount", label: "Dư nợ" },
  { key: "loan_purpose", label: "Mục đích vay" },
  { key: "repayment_source", label: "Nguồn trả nợ" },
];

/* ── Generic CRUD for credit records ── */

type CreditItem = { id: string } & Record<string, string | null>;

function CreditForm({
  fields,
  apiBase,
  prefix,
  initial,
  onSaved,
  onCancel,
}: {
  fields: FieldDef[];
  apiBase: string;
  prefix: string;
  initial?: CreditItem;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const obj: Record<string, string> = {};
    for (const f of fields) obj[f.key] = initial?.[f.key] ?? "";
    return obj;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const url = initial ? `${apiBase}/${initial.id}` : apiBase;
      const res = await fetch(url, {
        method: initial ? "PATCH" : "POST",
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
    <div className="rounded-xl border border-brand-200 dark:border-brand-500/20 bg-brand-50/30 dark:bg-brand-500/5 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{f.label}</span>
            {MONETARY_KEYS.has(f.key) ? (
              <input
                type="text"
                value={formatMonetary(f.key, form[f.key] ?? "")}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value.replace(/\D/g, "") }))}
                className={inputCls}
              />
            ) : (
              <SmartField
                fieldKey={`${prefix}${f.key}`}
                value={form[f.key] ?? ""}
                onChange={(val) => setForm((p) => ({ ...p, [f.key]: val }))}
                className={inputCls}
              />
            )}
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={handleSave} disabled={saving} className={`${btnCls} bg-brand-500 text-white shadow-sm`}>
          {saving ? "..." : initial ? "Cập nhật" : "Thêm"}
        </button>
        <button type="button" onClick={onCancel} className={`${btnCls} border border-zinc-200 dark:border-white/[0.09]`}>
          Hủy
        </button>
      </div>
    </div>
  );
}

/** Header fields shown in card header, rest in body */
const HEADER_KEYS_AGRI = new Set(["branch_name", "debt_group", "loan_term"]);
const HEADER_KEYS_OTHER = new Set(["institution_name", "debt_group", "loan_term"]);

function CreditRow({
  item,
  fields,
  apiBase,
  onRefresh,
}: {
  item: CreditItem;
  fields: FieldDef[];
  apiBase: string;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Xóa bản ghi này?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`${apiBase}/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) { alert(data.error ?? "Xóa thất bại"); return; }
      onRefresh();
    } finally {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <CreditForm
        fields={fields}
        apiBase={apiBase}
        prefix={fields === AGRIBANK_FIELDS ? "credit_agri." : "credit_other."}
        initial={item}
        onSaved={() => { setEditing(false); onRefresh(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const isAgribank = fields === AGRIBANK_FIELDS;
  const headerKeys = isAgribank ? HEADER_KEYS_AGRI : HEADER_KEYS_OTHER;
  const titleField = isAgribank ? "branch_name" : "institution_name";
  const titleValue = item[titleField] ?? "—";
  const debtGroup = item["debt_group"];
  const loanTerm = isAgribank ? item["loan_term"] : null;

  const bodyFields = fields.filter((f) => !headerKeys.has(f.key) && item[f.key]);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-50/80 dark:bg-white/[0.02]">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{titleValue}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {debtGroup && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  {debtGroup}
                </span>
              )}
              {loanTerm && (
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  TH: {loanTerm}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button type="button" onClick={() => setEditing(true)} className="p-1.5 rounded-md hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] transition-colors">
            <Pencil className="h-3.5 w-3.5 text-zinc-400" />
          </button>
          <button type="button" onClick={handleDelete} disabled={deleting} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
          </button>
        </div>
      </div>

      {/* Body */}
      {bodyFields.length > 0 && (
        <div className="px-4 py-3">
          <div className="grid grid-cols-3 gap-x-6 gap-y-2">
            {bodyFields.map((f) => (
              <div key={f.key} className="flex flex-col gap-0.5">
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{f.label}</span>
                <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200">{formatMonetary(f.key, item[f.key] ?? null)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CreditList({
  title,
  fields,
  apiBase,
  prefix,
  emptyText,
}: {
  title: string;
  fields: FieldDef[];
  apiBase: string;
  prefix: string;
  emptyText: string;
}) {
  const [items, setItems] = useState<CreditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(apiBase);
    const data = await res.json();
    if (data.ok) setItems(data.items ?? []);
    setLoading(false);
  }, [apiBase]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
      </div>
    );
  }

  return (
    <DropdownOptionsProvider prefix={prefix}>
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {title} ({items.length})
        </h3>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className={`${btnCls} inline-flex items-center gap-1.5 bg-brand-500 text-white shadow-sm shadow-brand-500/25 hover:brightness-110`}
        >
          <Plus className="h-3.5 w-3.5" /> Thêm
        </button>
      </div>

      {showForm && (
        <CreditForm
          fields={fields}
          apiBase={apiBase}
          prefix={prefix}
          onSaved={() => { setShowForm(false); void load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {items.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-8 text-center">
          <p className="text-sm text-zinc-400 dark:text-slate-500">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <CreditRow key={item.id} item={item} fields={fields} apiBase={apiBase} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
    </DropdownOptionsProvider>
  );
}

/* ── Main Export ── */

export function CustomerCreditInfoSection({ customerId }: { customerId: string }) {
  const [subTab, setSubTab] = useState<"agribank" | "other">("agribank");

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {([
          { key: "agribank" as const, label: "Vay vốn tại Agribank" },
          { key: "other" as const, label: "Vay vốn tại TCTD khác" },
        ]).map((st) => (
          <button
            key={st.key}
            type="button"
            onClick={() => setSubTab(st.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              subTab === st.key
                ? "bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                : "text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.05]"
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {subTab === "agribank" && (
        <CreditList
          title="Vay vốn tại Agribank"
          fields={AGRIBANK_FIELDS}
          apiBase={`/api/customers/${customerId}/credit-agribank`}
          prefix="credit_agri."
          emptyText="Chưa có thông tin vay vốn tại Agribank"
        />
      )}

      {subTab === "other" && (
        <CreditList
          title="Vay vốn tại TCTD khác"
          fields={OTHER_FIELDS}
          apiBase={`/api/customers/${customerId}/credit-other`}
          prefix="credit_other."
          emptyText="Chưa có thông tin vay vốn tại TCTD khác"
        />
      )}
    </div>
  );
}

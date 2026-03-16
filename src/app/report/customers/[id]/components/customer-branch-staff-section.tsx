"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check } from "lucide-react";
import { inputCls, btnCls } from "./shared-form-styles";
import { SmartField } from "@/components/smart-field";
import { DropdownOptionsProvider } from "@/lib/hooks/dropdown-options-context";

/* ── Types ── */

type BranchItem = {
  id: string;
  name: string;
  name_uppercase: string | null;
  address: string | null;
  branch_code: string | null;
  phone: string | null;
  fax: string | null;
  tax_code: string | null;
  tax_issued_date: string | null;
  tax_issued_place: string | null;
  district: string | null;
  province: string | null;
};

type StaffData = {
  relationship_officer: string;
  appraiser: string;
  approver_name: string;
  approver_title: string;
};

const BRANCH_FIELDS: { key: keyof Omit<BranchItem, "id">; label: string }[] = [
  { key: "name", label: "Tên chi nhánh/PGD" },
  { key: "name_uppercase", label: "Tên gọi in hoa" },
  { key: "address", label: "Địa chỉ trụ sở" },
  { key: "branch_code", label: "Mã CN" },
  { key: "phone", label: "Điện thoại" },
  { key: "fax", label: "Fax" },
  { key: "tax_code", label: "Mã số thuế CN" },
  { key: "tax_issued_date", label: "Ngày cấp MST" },
  { key: "tax_issued_place", label: "Nơi cấp MST" },
  { key: "district", label: "Quận/Huyện" },
  { key: "province", label: "Tỉnh/TP" },
];


/* ── Branch Form ── */

function BranchForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: BranchItem;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const obj: Record<string, string> = {};
    for (const f of BRANCH_FIELDS) obj[f.key] = (initial as Record<string, string | null> | undefined)?.[f.key] ?? "";
    return obj;
  });
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  async function handleSave() {
    if (!form.name?.trim()) return;
    setSaving(true);
    setError("");
    try {
      const url = initial ? `/api/branches/${initial.id}` : "/api/branches";
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
    <div className="rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50/30 dark:bg-violet-500/5 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {BRANCH_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {f.label}{f.key === "name" ? " *" : ""}
            </span>
            <input
              value={form[f.key] ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
              className={inputCls}
            />
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

/* ── Branch Card (select-active pattern) ── */

function BranchCard({
  item,
  isActive,
  onSelect,
  onRefresh,
}: {
  item: BranchItem;
  isActive: boolean;
  onSelect: () => void;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Xóa chi nhánh này?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/branches/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) { alert(data.error ?? "Xóa thất bại"); return; }
      onRefresh();
    } finally {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <BranchForm
        initial={item}
        onSaved={() => { setEditing(false); onRefresh(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div
      className={`border rounded-lg p-4 transition-colors cursor-pointer ${
        isActive
          ? "border-violet-400 dark:border-violet-500/40 bg-violet-50/50 dark:bg-violet-500/10 ring-1 ring-violet-400/30"
          : "border-zinc-200 dark:border-white/[0.07] hover:border-violet-200 dark:hover:border-violet-500/20"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {isActive && <Check className="h-4 w-4 text-violet-600 dark:text-violet-400" />}
            <span className="text-sm font-semibold">{item.name}</span>
            {item.branch_code && <span className="text-xs text-zinc-400">({item.branch_code})</span>}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs mt-1">
            {BRANCH_FIELDS.slice(1).map((f) => {
              const val = (item as unknown as Record<string, string | null>)[f.key];
              if (!val) return null;
              return (
                <div key={f.key} className="flex flex-col">
                  <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">{f.label}</span>
                  <span className="text-sm text-zinc-800 dark:text-zinc-200">{val}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
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

/* ── Branch List Subtab ── */

function BranchListSection({
  activeBranchId,
  onActiveBranchChange,
}: {
  activeBranchId: string | null;
  onActiveBranchChange: (id: string | null) => void;
}) {
  const [items, setItems] = useState<BranchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/branches");
    const data = await res.json();
    if (data.ok) setItems(data.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function selectBranch(branchId: string) {
    const newId = branchId === activeBranchId ? null : branchId;
    const prevId = activeBranchId;
    onActiveBranchChange(newId);
    try {
      const res = await fetch("/api/config/branch-staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_branch_id: newId }),
      });
      const data = await res.json();
      if (!data.ok) { onActiveBranchChange(prevId); alert(data.error ?? "Lỗi lưu"); }
    } catch { onActiveBranchChange(prevId); }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Chi nhánh/PGD ({items.length})
          {activeBranchId && <span className="ml-2 text-xs text-violet-600 dark:text-violet-400">• 1 đang chọn</span>}
        </h3>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className={`${btnCls} inline-flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm shadow-violet-500/25 hover:brightness-110`}
        >
          <Plus className="h-3.5 w-3.5" /> Thêm CN/PGD
        </button>
      </div>

      {showForm && (
        <BranchForm
          onSaved={() => { setShowForm(false); void load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {items.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-8 text-center">
          <p className="text-sm text-zinc-400 dark:text-slate-500">Chưa có chi nhánh nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <BranchCard
              key={item.id}
              item={item}
              isActive={item.id === activeBranchId}
              onSelect={() => selectBranch(item.id)}
              onRefresh={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Staff Subtab ── */

function StaffSection({ initial }: { initial: StaffData }) {
  const [form, setForm] = useState<StaffData>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      // Save to global config → syncs all customers
      await fetch("/api/config/branch-staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4 rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Bộ phận làm hồ sơ</h3>

      <label className="block">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Cán bộ quan hệ khách hàng</span>
        <SmartField
          fieldKey="branch.relationship_officer"
          value={form.relationship_officer}
          onChange={(val) => setForm((p) => ({ ...p, relationship_officer: val }))}
          className={inputCls}
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Người thẩm định</span>
        <SmartField
          fieldKey="branch.appraiser"
          value={form.appraiser}
          onChange={(val) => setForm((p) => ({ ...p, appraiser: val }))}
          className={inputCls}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Người phê duyệt</span>
          <SmartField
            fieldKey="branch.approver_name"
            value={form.approver_name}
            onChange={(val) => setForm((p) => ({ ...p, approver_name: val }))}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Chức vụ</span>
          <SmartField
            fieldKey="branch.approver_title"
            value={form.approver_title}
            onChange={(val) => setForm((p) => ({ ...p, approver_title: val }))}
            className={inputCls}
          />
        </label>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button type="button" onClick={handleSave} disabled={saving} className={`${btnCls} bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm`}>
          {saving ? "..." : "Lưu"}
        </button>
        {saved && <span className="text-xs text-emerald-600 dark:text-emerald-400">Đã lưu</span>}
      </div>
    </div>
  );
}

/* ── Main Export ── */

export function CustomerBranchStaffSection() {
  const [subTab, setSubTab] = useState<"branch" | "staff">("branch");
  const [loading, setLoading] = useState(true);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [staffData, setStaffData] = useState<StaffData>({
    relationship_officer: "",
    appraiser: "",
    approver_name: "",
    approver_title: "",
  });

  // Load global config on mount
  useEffect(() => {
    fetch("/api/config/branch-staff")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.config) {
          setActiveBranchId(d.config.active_branch_id);
          setStaffData({
            relationship_officer: d.config.relationship_officer ?? "",
            appraiser: d.config.appraiser ?? "",
            approver_name: d.config.approver_name ?? "",
            approver_title: d.config.approver_title ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2">
        Thay đổi ở đây sẽ áp dụng cho tất cả khách hàng.
      </p>
      <div className="flex gap-1">
        {([
          { key: "branch" as const, label: "Chi nhánh/PGD" },
          { key: "staff" as const, label: "Bộ phận làm hồ sơ" },
        ]).map((st) => (
          <button
            key={st.key}
            type="button"
            onClick={() => setSubTab(st.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              subTab === st.key
                ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400"
                : "text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.05]"
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {subTab === "branch" && (
        <BranchListSection
          activeBranchId={activeBranchId}
          onActiveBranchChange={setActiveBranchId}
        />
      )}

      {subTab === "staff" && (
        <DropdownOptionsProvider prefix="branch.">
          <StaffSection key={JSON.stringify(staffData)} initial={staffData} />
        </DropdownOptionsProvider>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { inputCls, btnCls } from "./shared-form-styles";
import { SmartField } from "@/components/smart-field";
import {
  COLLATERAL_TYPES, FORM_FIELDS, EMPTY_OWNER,
  QSD_CERT_KEYS, QSD_LAND_KEYS, QSD_HOUSE_KEYS, QSD_CONTRACT_KEYS,
  DS_VEHICLE_KEYS, DS_REG_KEYS, DS_CONTRACT_KEYS, DS_INSURANCE_KEYS,
  NUMBER_KEYS, DECIMAL_KEYS, DATE_KEYS, fmtNumber, fmtDate,
  type OwnerEntry, type CollateralItem,
} from "./collateral-config";
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";

/* ── Owner inline row (repeater) ── */
function OwnerRow({ owner, index, onChange, onRemove }: {
  owner: OwnerEntry; index: number;
  onChange: (idx: number, patch: Partial<OwnerEntry>) => void;
  onRemove: (idx: number) => void;
}) {
  const set = (key: keyof OwnerEntry, val: string) => onChange(index, { [key]: val });
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-white/[0.07] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-zinc-500">Chủ sở hữu #{index + 1}</span>
        <button type="button" onClick={() => onRemove(index)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10">
          <Trash2 className="h-3 w-3 text-red-400" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] text-zinc-500">Tên chủ sở hữu</span>
          <input value={owner.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-[11px] text-zinc-500">Loại giấy tờ</span>
          <SmartField fieldKey="collateral.owner_id_type" value={owner.id_type} onChange={(val) => set("id_type", val)} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-[11px] text-zinc-500">CCCD/CMND</span>
          <input value={owner.cccd} onChange={(e) => set("cccd", e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-[11px] text-zinc-500">Nơi cấp</span>
          <input value={owner.cccd_place} onChange={(e) => set("cccd_place", e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-[11px] text-zinc-500">Ngày cấp</span>
          <input value={owner.cccd_date} onChange={(e) => set("cccd_date", e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-[11px] text-zinc-500">CMND cũ</span>
          <input value={owner.cmnd_old} onChange={(e) => set("cmnd_old", e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-[11px] text-zinc-500">Năm sinh</span>
          <input value={owner.birth_year} onChange={(e) => set("birth_year", e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-[11px] text-zinc-500">Điện thoại</span>
          <input value={owner.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
        </label>
        <label className="block col-span-2">
          <span className="text-[11px] text-zinc-500">Nơi thường trú</span>
          <input value={owner.address} onChange={(e) => set("address", e.target.value)} className={inputCls} />
        </label>
        <label className="block col-span-2">
          <span className="text-[11px] text-zinc-500">Địa chỉ hiện tại</span>
          <input value={owner.current_address} onChange={(e) => set("current_address", e.target.value)} className={inputCls} />
        </label>
      </div>
    </div>
  );
}

/* ── Multi-land-type rows (max 3): Loại đất | Diện tích | Đơn giá | Thành tiền ── */
function LandTypeRows({ props, setProps }: {
  props: Record<string, string>;
  setProps: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  /* Auto-calculate Thành tiền = Diện tích × Đơn giá when either changes */
  const setField = (key: string, val: string) => {
    setProps((p) => {
      const next = { ...p, [key]: val };
      // Detect which row was changed and recalculate land_value_N
      const match = key.match(/^land_(area|unit_price)_(\d)$/);
      if (match) {
        const idx = match[2];
        // Diện tích cho phép thập phân (dùng dấu . hoặc , làm decimal separator)
        const areaStr = (next[`land_area_${idx}`] ?? "").replace(/,/g, ".");
        const area = parseFloat(areaStr) || 0;
        const price = Number((next[`land_unit_price_${idx}`] ?? "0").replace(/\./g, "")) || 0;
        next[`land_value_${idx}`] = area && price ? String(Math.round(area * price)) : "";
      }
      return next;
    });
  };
  const rows = [1, 2, 3] as const;
  return (
    <div className="space-y-2">
      <h5 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Chi tiết giá trị đất</h5>
      <div className="grid grid-cols-[1fr_6rem_7rem_8rem] gap-2 items-end">
        <span className="text-[10px] text-zinc-400 font-medium">Loại đất</span>
        <span className="text-[10px] text-zinc-400 font-medium">Diện tích</span>
        <span className="text-[10px] text-zinc-400 font-medium">Đơn giá</span>
        <span className="text-[10px] text-zinc-400 font-medium">Thành tiền</span>
      </div>
      {rows.map((i) => {
        const typeKey = `land_type_${i}`;
        const areaKey = `land_area_${i}`;
        const priceKey = `land_unit_price_${i}`;
        const valKey = `land_value_${i}`;
        return (
          <div key={i} className="grid grid-cols-[1fr_6rem_7rem_8rem] gap-2 items-center">
            <SmartField
              fieldKey={`collateral.land_type`}
              value={props[typeKey] ?? ""}
              onChange={(val) => setField(typeKey, val)}
              className={inputCls}
            />
            <input
              type="text"
              value={props[areaKey] ?? ""}
              onChange={(e) => setField(areaKey, e.target.value.replace(/[^\d.,]/g, ""))}
              className={inputCls}
              placeholder="m²"
            />
            <input
              type="text"
              value={props[priceKey] ? fmtNumber(props[priceKey]) : ""}
              onChange={(e) => setField(priceKey, e.target.value.replace(/\D/g, ""))}
              className={inputCls}
              placeholder="đ/m²"
            />
            <input
              type="text"
              readOnly
              value={props[valKey] ? fmtNumber(props[valKey]) : ""}
              className={`${inputCls} bg-zinc-50 dark:bg-white/[0.03] cursor-default`}
              placeholder="đồng"
            />
          </div>
        );
      })}
    </div>
  );
}

/* ── Section header for form groups ── */
function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{title}</h4>
      {children}
    </div>
  );
}

/* ── Main CollateralForm ── */
export function CollateralForm({ customerId, initial, onSaved, onCancel }: {
  customerId: string;
  initial?: CollateralItem;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState(initial?.collateral_type ?? "qsd_dat");
  const [name, setName] = useState(initial?.name ?? "");
  const [totalValue, setTotalValue] = useState(String(initial?.total_value ?? ""));
  const [obligation, setObligation] = useState(String(initial?.obligation ?? ""));
  const [props, setProps] = useState<Record<string, string>>(initial?.properties ?? {});
  const [saving, setSaving] = useState(false);

  // qsd_dat: "Có tài sản trên đất" toggle
  const [hasAssetOnLand, setHasAssetOnLand] = useState(() => {
    const houseKeys = ["house_type", "construction_area", "floor_area", "house_structure", "house_value"];
    return houseKeys.some((k) => initial?.properties?.[k]);
  });

  // Owners repeater (JSON in properties._owners)
  const [owners, setOwners] = useState<OwnerEntry[]>(() => {
    try { return JSON.parse(initial?.properties?._owners ?? "[]"); } catch { return []; }
  });

  const fields = FORM_FIELDS[type] ?? [];

  function handleOwnerChange(idx: number, patch: Partial<OwnerEntry>) {
    setOwners((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  }
  function handleOwnerRemove(idx: number) {
    setOwners((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const finalProps = { ...props };
      if (owners.length > 0) finalProps._owners = JSON.stringify(owners);
      else delete finalProps._owners;
      // Clear house fields if unchecked
      if (type === "qsd_dat" && !hasAssetOnLand) {
        for (const k of QSD_HOUSE_KEYS) delete finalProps[k];
      }
      const payload = {
        collateral_type: type,
        name: name.trim(),
        total_value: totalValue ? Number(totalValue.replace(/\./g, "")) : null,
        obligation: obligation ? Number(obligation.replace(/\./g, "")) : null,
        properties: finalProps,
      };
      const url = initial
        ? `/api/customers/${customerId}/collaterals/${initial.id}`
        : `/api/customers/${customerId}/collaterals`;
      await fetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      onSaved();
    } finally { setSaving(false); }
  }

  /* Render a single field — SmartField for text, plain input for number/date */
  const renderField = (key: string, label: string) => {
    const isNumber = NUMBER_KEYS.has(key);
    const isDecimal = DECIMAL_KEYS.has(key);
    const isDate = DATE_KEYS.has(key);
    const rawVal = props[key] ?? "";
    if (isDecimal) {
      // Decimal fields: show raw value, allow digits + dot + comma
      return (
        <label key={key} className="block">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
          <input type="text" value={rawVal}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d.,]/g, "");
              setProps((p) => {
                const next = { ...p, [key]: v };
                // Auto-calc "diện tích bằng chữ" when land_area changes
                if (key === "land_area") {
                  const num = parseFloat(v.replace(/,/g, ".")) || 0;
                  next.land_area_words = num > 0 ? numberToVietnameseWords(num, "mét vuông") : "";
                }
                return next;
              });
            }}
            className={inputCls} />
        </label>
      );
    }
    if (isNumber || isDate) {
      const displayVal = isNumber ? (rawVal ? fmtNumber(rawVal) : "") : (rawVal ? fmtDate(rawVal) : "");
      return (
        <label key={key} className="block">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
          <input type="text" value={displayVal}
            onChange={(e) => { const v = isNumber ? e.target.value.replace(/\D/g, "") : e.target.value; setProps((p) => ({ ...p, [key]: v })); }}
            className={inputCls} />
        </label>
      );
    }
    return (
      <label key={key} className="block">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
        <SmartField fieldKey={`collateral.${key}`} value={rawVal}
          onChange={(val) => setProps((p) => ({ ...p, [key]: val }))} className={inputCls} />
      </label>
    );
  };

  /* Render a group of fields by key filter */
  const renderGroup = (keys: string[]) => (
    <div className="grid grid-cols-2 gap-3">
      {fields.filter((f) => keys.includes(f.key)).map((f) => renderField(f.key, f.label))}
    </div>
  );

  return (
    <div className="rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50/30 dark:bg-violet-500/5 p-4 space-y-3">
      {/* Common header fields */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Loại TSBĐ</span>
          <select value={type} onChange={(e) => { setType(e.target.value); setProps({}); setOwners([]); setHasAssetOnLand(false); }} className={inputCls}>
            {COLLATERAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Tên TSBĐ *</span>
          <SmartField fieldKey="collateral.name" value={name} onChange={setName} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Tổng giá trị TS</span>
          <input type="text" value={totalValue ? fmtNumber(totalValue) : ""} onChange={(e) => setTotalValue(e.target.value.replace(/\D/g, ""))} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Nghĩa vụ bảo đảm</span>
          <input type="text" value={obligation ? fmtNumber(obligation) : ""} onChange={(e) => setObligation(e.target.value.replace(/\D/g, ""))} className={inputCls} />
        </label>
      </div>

      {/* ═══ QSD ĐẤT (Bất động sản) ═══ */}
      {type === "qsd_dat" && fields.length > 0 && (
        <div className="space-y-6 pt-2 border-t border-zinc-200 dark:border-white/[0.07]">
          {/* Chủ sở hữu */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Chủ sở hữu tài sản</h4>
              <button type="button" onClick={() => setOwners((prev) => [...prev, { ...EMPTY_OWNER }])}
                className={`${btnCls} inline-flex items-center gap-1 text-[11px] border border-zinc-200 dark:border-white/[0.09]`}>
                <Plus className="h-3 w-3" /> Thêm
              </button>
            </div>
            {owners.length === 0 && (
              <p className="text-xs text-zinc-400 px-1">Mặc định là người vay/đồng vay. Chỉ thêm khi chủ sở hữu là bên thứ ba.</p>
            )}
            <div className="space-y-2">
              {owners.map((o, i) => <OwnerRow key={i} owner={o} index={i} onChange={handleOwnerChange} onRemove={handleOwnerRemove} />)}
            </div>
          </div>
          {/* Giấy chứng nhận */}
          <div>
            <SectionHeader title="Giấy chứng nhận" />
            {renderGroup(QSD_CERT_KEYS)}
          </div>
          {/* Thông tin thửa đất */}
          <div>
            <SectionHeader title="Thông tin thửa đất" />
            {renderGroup(QSD_LAND_KEYS)}
            <div className="mt-4">
              <LandTypeRows props={props} setProps={setProps} />
            </div>
          </div>
          {/* TS gắn liền với đất — conditional */}
          <div>
            <SectionHeader title="Tài sản gắn liền với đất">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={hasAssetOnLand} onChange={(e) => setHasAssetOnLand(e.target.checked)}
                  className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500/30 h-3.5 w-3.5" />
                <span className="text-[11px] text-zinc-500">Có tài sản trên đất</span>
              </label>
            </SectionHeader>
            {hasAssetOnLand && renderGroup(QSD_HOUSE_KEYS)}
          </div>
          {/* Hợp đồng bảo đảm */}
          <div>
            <SectionHeader title="Hợp đồng bảo đảm" />
            {renderGroup(QSD_CONTRACT_KEYS)}
          </div>
        </div>
      )}

      {/* ═══ ĐỘNG SẢN (Phương tiện GT) ═══ */}
      {type === "dong_san" && fields.length > 0 && (
        <div className="space-y-6 pt-2 border-t border-zinc-200 dark:border-white/[0.07]">
          <div>
            <SectionHeader title="Thông tin phương tiện" />
            {renderGroup(DS_VEHICLE_KEYS)}
          </div>
          <div>
            <SectionHeader title="Giấy tờ đăng ký" />
            {renderGroup(DS_REG_KEYS)}
          </div>
          <div>
            <SectionHeader title="Hợp đồng bảo đảm" />
            {renderGroup(DS_CONTRACT_KEYS)}
          </div>
          <div>
            <SectionHeader title="Bảo hiểm" />
            {renderGroup(DS_INSURANCE_KEYS)}
          </div>
        </div>
      )}

      {/* ═══ Other types: flat grid ═══ */}
      {type !== "qsd_dat" && type !== "dong_san" && fields.length > 0 && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200 dark:border-white/[0.07]">
          {fields.map((f) => renderField(f.key, f.label))}
        </div>
      )}

      {/* Save/Cancel */}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={handleSave} disabled={saving}
          className={`${btnCls} bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm`}>
          {saving ? "..." : initial ? "Cập nhật" : "Thêm"}
        </button>
        <button type="button" onClick={onCancel} className={`${btnCls} border border-zinc-200 dark:border-white/[0.09]`}>
          Hủy
        </button>
      </div>
    </div>
  );
}

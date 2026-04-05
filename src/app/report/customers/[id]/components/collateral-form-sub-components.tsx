"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { inputCls } from "./shared-form-styles";
import { SmartField } from "@/components/smart-field";
import { fmtNumber, roundDown, ROUNDING_OPTIONS, type OwnerEntry, type AmendmentEntry } from "./collateral-config";

/* ── Owner inline row (repeater) ── */
export function OwnerRow({ owner, index, onChange, onRemove }: {
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

// Input class without w-full for use inside flex containers
export const flexInputCls =
  "rounded-md border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] text-zinc-900 dark:text-slate-100 px-3 py-1.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40";

/* ── Amendment row (Văn bản sửa đổi) ── */
export function AmendmentRow({ amendment, index, onChange, onRemove }: {
  amendment: AmendmentEntry; index: number;
  onChange: (idx: number, patch: Partial<AmendmentEntry>) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-zinc-400 w-4 shrink-0">{index + 1}.</span>
      <input
        value={amendment.name}
        onChange={(e) => onChange(index, { name: e.target.value })}
        placeholder="Tên văn bản sửa đổi"
        className={`${flexInputCls} flex-1 min-w-0`}
      />
      <input
        value={amendment.number ?? ""}
        onChange={(e) => onChange(index, { number: e.target.value })}
        placeholder="Số văn bản"
        className={`${flexInputCls} w-28 shrink-0`}
      />
      <input
        value={amendment.date}
        onChange={(e) => onChange(index, { date: e.target.value })}
        placeholder="Ngày (dd/mm/yyyy)"
        className={`${flexInputCls} w-36 shrink-0`}
      />
      <button type="button" onClick={() => onRemove(index)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0">
        <Trash2 className="h-3 w-3 text-red-400" />
      </button>
    </div>
  );
}

/* ── Multi-land-type rows (max 3): Loại đất | Diện tích | Đơn giá | Thành tiền ── */
export function LandTypeRows({ props, setProps }: {
  props: Record<string, string>;
  setProps: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const rounding = props.land_rounding ?? "0";
  const precision = Number(rounding) || 0;

  /** Compute raw value (exact) for a land row */
  const computeRaw = (next: Record<string, string>, idx: number) => {
    const areaStr = (next[`land_area_${idx}`] ?? "").replace(/,/g, ".");
    const area = parseFloat(areaStr) || 0;
    const price = Number((next[`land_unit_price_${idx}`] ?? "0").replace(/\./g, "")) || 0;
    return area && price ? Math.round(area * price) : 0;
  };

  const setField = (key: string, val: string) => {
    setProps((p) => {
      const next = { ...p, [key]: val };
      const match = key.match(/^land_(area|unit_price)_(\d)$/);
      if (match) {
        const raw = computeRaw(next, Number(match[2]));
        const rounded = precision > 0 ? roundDown(raw, precision) : raw;
        next[`land_value_${match[2]}`] = rounded ? String(rounded) : "";
      }
      return next;
    });
  };

  /** Recalculate all rows when rounding changes */
  const handleRoundingChange = (val: string) => {
    setProps((p) => {
      const next: Record<string, string> = { ...p, land_rounding: val };
      const prec = Number(val) || 0;
      for (const i of [1, 2, 3]) {
        const raw = computeRaw(next, i);
        const rounded = prec > 0 ? roundDown(raw, prec) : raw;
        next[`land_value_${i}`] = rounded ? String(rounded) : "";
      }
      return next;
    });
  };

  const rows = [1, 2, 3] as const;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h5 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Chi tiết giá trị đất</h5>
        <div className="flex rounded-lg border border-zinc-200 dark:border-white/[0.09] overflow-hidden">
          {ROUNDING_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => handleRoundingChange(o.value)}
              className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                rounding === o.value
                  ? "bg-amber-600 text-white"
                  : "bg-white dark:bg-[#1a1a1a] text-zinc-500 dark:text-zinc-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
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
        const raw = computeRaw(props, i);
        const displayed = Number(props[valKey] || "0");
        const showTooltip = precision > 0 && raw !== displayed && raw > 0;
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
              title={showTooltip ? `Gốc: ${fmtNumber(String(raw))}` : undefined}
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
export function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{title}</h4>
      {children}
    </div>
  );
}

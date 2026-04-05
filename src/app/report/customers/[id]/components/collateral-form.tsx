"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { inputCls, btnCls } from "./shared-form-styles";
import { SmartField } from "@/components/smart-field";
import {
  COLLATERAL_TYPES, FORM_FIELDS, EMPTY_OWNER, EMPTY_AMENDMENT,
  QSD_CERT_KEYS, QSD_LAND_KEYS, QSD_HOUSE_KEYS, QSD_CONTRACT_KEYS,
  DS_VEHICLE_KEYS, DS_REG_KEYS, DS_CONTRACT_KEYS, DS_INSURANCE_KEYS,
  NUMBER_KEYS, DECIMAL_KEYS, DATE_KEYS, fmtNumber, fmtDecimal, fmtDate,
  TK_SUBTYPES, GTCG_PAPER_TYPES, GTCG_ONLY_KEYS,
  ROUNDING_OPTIONS, roundDown,
  type OwnerEntry, type AmendmentEntry, type CollateralItem,
} from "./collateral-config";
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import { OwnerRow, AmendmentRow, LandTypeRows, SectionHeader } from "./collateral-form-sub-components";

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
  const [props, setProps] = useState<Record<string, string>>(() => {
    // Normalize ISO dates (2025-01-15) to dd/mm/yyyy on load
    const raw = { ...(initial?.properties ?? {}) };
    for (const key of Object.keys(raw)) {
      if (DATE_KEYS.has(key) && raw[key]) raw[key] = fmtDate(raw[key]);
    }
    return raw;
  });
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

  // Amendments repeater (JSON in properties._amendments)
  const [amendments, setAmendments] = useState<AmendmentEntry[]>(() => {
    try {
      const raw: AmendmentEntry[] = JSON.parse(initial?.properties?._amendments ?? "[]");
      // Auto-fix legacy formats: add missing `number` field
      return raw.map((a) => ({
        name: a.name ?? "",
        number: a.number ?? "",
        date: a.date ?? "",
      }));
    } catch { return []; }
  });

  const fields = FORM_FIELDS[type] ?? [];

  // Auto-calc: Tổng giá trị TS = Σ land_value_N + house_appraisal_value (for BĐS only)
  useEffect(() => {
    if (type !== "qsd_dat") return;
    let sum = 0;
    for (const i of [1, 2, 3]) {
      sum += Number((props[`land_value_${i}`] ?? "0").replace(/\./g, "")) || 0;
    }
    if (hasAssetOnLand) {
      sum += Number((props.house_appraisal_value ?? "0").replace(/\./g, "")) || 0;
    }
    setTotalValue(sum > 0 ? String(sum) : "");
  }, [type, hasAssetOnLand, props.land_value_1, props.land_value_2, props.land_value_3, props.house_appraisal_value]);

  function handleOwnerChange(idx: number, patch: Partial<OwnerEntry>) {
    setOwners((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  }
  function handleOwnerRemove(idx: number) {
    setOwners((prev) => prev.filter((_, i) => i !== idx));
  }
  function handleAmendmentChange(idx: number, patch: Partial<AmendmentEntry>) {
    setAmendments((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }
  function handleAmendmentRemove(idx: number) {
    setAmendments((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const finalProps = { ...props };
      if (owners.length > 0) finalProps._owners = JSON.stringify(owners);
      else delete finalProps._owners;
      if (amendments.length > 0) finalProps._amendments = JSON.stringify(amendments);
      else delete finalProps._amendments;
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
      const isEdit = !!(initial?.id);
      const url = isEdit
        ? `/api/customers/${customerId}/collaterals/${initial.id}`
        : `/api/customers/${customerId}/collaterals`;
      await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
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
      // Decimal fields: format với phân cách hàng ngàn, giữ phần thập phân
      return (
        <label key={key} className="block">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
          <input type="text" value={rawVal ? fmtDecimal(rawVal) : ""}
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
    if (isNumber) {
      return (
        <label key={key} className="block">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
          <input type="text" value={rawVal ? fmtNumber(rawVal) : ""}
            onChange={(e) => setProps((p) => ({ ...p, [key]: e.target.value.replace(/\D/g, "") }))}
            className={inputCls} />
        </label>
      );
    }
    if (isDate) {
      // Store dd/mm/yyyy directly — no re-formatting on display to avoid cursor issues
      return (
        <label key={key} className="block">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
          <input type="text" value={rawVal} placeholder="dd/mm/yyyy" maxLength={10}
            onChange={(e) => setProps((p) => ({ ...p, [key]: e.target.value }))}
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
    <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5 p-4 space-y-3">
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
          {type === "qsd_dat" ? (
            <input type="text" readOnly
              value={totalValue ? fmtNumber(totalValue) : ""}
              title="Tự tính = Tổng giá trị đất + Giá trị TS gắn liền"
              className={`${inputCls} bg-zinc-50 dark:bg-white/[0.03] cursor-default`} />
          ) : (
            <input type="text" value={totalValue ? fmtNumber(totalValue) : ""} onChange={(e) => setTotalValue(e.target.value.replace(/\D/g, ""))} className={inputCls} />
          )}
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Nghĩa vụ bảo đảm</span>
          <input type="text" value={obligation ? fmtNumber(obligation) : ""} onChange={(e) => setObligation(e.target.value.replace(/\D/g, ""))} className={inputCls} />
        </label>
        {type !== "tiet_kiem" && (
          <label className="block col-span-2 sm:col-span-3">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Khái quát về lợi thế</span>
            <input type="text" value={props.advantage_summary ?? ""} onChange={(e) => setProps((p) => ({ ...p, advantage_summary: e.target.value }))} className={inputCls} />
          </label>
        )}
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
                  className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500/30 h-3.5 w-3.5" />
                <span className="text-[11px] text-zinc-500">Có tài sản trên đất</span>
              </label>
            </SectionHeader>
            {hasAssetOnLand && (
              <>
                {renderGroup(QSD_HOUSE_KEYS.filter((k) => !k.startsWith("house_appraisal")))}
                {/* Định giá nhà: DT × Đơn giá = Thành tiền (with rounding) */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Định giá nhà ở</h5>
                    <div className="flex rounded-lg border border-zinc-200 dark:border-white/[0.09] overflow-hidden">
                      {ROUNDING_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => {
                            const prec = Number(o.value) || 0;
                            setProps((p) => {
                              const next: Record<string, string> = { ...p, house_rounding: o.value };
                              const area = parseFloat((next.house_appraisal_area ?? "0").replace(/,/g, ".")) || 0;
                              const price = Number((next.house_unit_price ?? "0").replace(/\./g, "")) || 0;
                              const raw = area && price ? Math.round(area * price) : 0;
                              next.house_appraisal_value = raw ? String(prec > 0 ? roundDown(raw, prec) : raw) : "";
                              return next;
                            });
                          }}
                          className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                            (props.house_rounding ?? "0") === o.value
                              ? "bg-amber-600 text-white"
                              : "bg-white dark:bg-[#1a1a1a] text-zinc-500 dark:text-zinc-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="block">
                      <span className="text-[10px] text-zinc-400">DT định giá (m²)</span>
                      <input type="text" value={props.house_appraisal_area ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^\d.,]/g, "");
                          setProps((p) => {
                            const next: Record<string, string> = { ...p, house_appraisal_area: v };
                            const area = parseFloat(v.replace(/,/g, ".")) || 0;
                            const price = Number((next.house_unit_price ?? "0").replace(/\./g, "")) || 0;
                            const raw = area && price ? Math.round(area * price) : 0;
                            const prec = Number(next.house_rounding ?? "0") || 0;
                            next.house_appraisal_value = raw ? String(prec > 0 ? roundDown(raw, prec) : raw) : "";
                            return next;
                          });
                        }}
                        className={inputCls} placeholder="m²" />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-zinc-400">Đơn giá (đ/m²)</span>
                      <input type="text"
                        value={props.house_unit_price ? fmtNumber(props.house_unit_price) : ""}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "");
                          setProps((p) => {
                            const next: Record<string, string> = { ...p, house_unit_price: v };
                            const area = parseFloat((next.house_appraisal_area ?? "0").replace(/,/g, ".")) || 0;
                            const price = Number(v) || 0;
                            const raw = area && price ? Math.round(area * price) : 0;
                            const prec = Number(next.house_rounding ?? "0") || 0;
                            next.house_appraisal_value = raw ? String(prec > 0 ? roundDown(raw, prec) : raw) : "";
                            return next;
                          });
                        }}
                        className={inputCls} placeholder="đ/m²" />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-zinc-400">Thành tiền</span>
                      {(() => {
                        const area = parseFloat((props.house_appraisal_area ?? "0").replace(/,/g, ".")) || 0;
                        const price = Number((props.house_unit_price ?? "0").replace(/\./g, "")) || 0;
                        const raw = area && price ? Math.round(area * price) : 0;
                        const displayed = Number(props.house_appraisal_value || "0");
                        const prec = Number(props.house_rounding ?? "0") || 0;
                        const showTooltip = prec > 0 && raw !== displayed && raw > 0;
                        return (
                          <input type="text" readOnly
                            value={props.house_appraisal_value ? fmtNumber(props.house_appraisal_value) : ""}
                            title={showTooltip ? `Gốc: ${fmtNumber(String(raw))}` : undefined}
                            className={`${inputCls} bg-zinc-50 dark:bg-white/[0.03] cursor-default`} placeholder="đồng" />
                        );
                      })()}
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
          {/* Hợp đồng bảo đảm */}
          <div>
            <SectionHeader title="Hợp đồng bảo đảm" />
            {renderGroup(QSD_CONTRACT_KEYS)}
            {/* Văn bản sửa đổi */}
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-500">Văn bản sửa đổi, bổ sung</span>
                <button type="button" onClick={() => setAmendments((prev) => [...prev, { ...EMPTY_AMENDMENT }])}
                  className={`${btnCls} inline-flex items-center gap-1 text-[11px] border border-zinc-200 dark:border-white/[0.09]`}>
                  <Plus className="h-3 w-3" /> Thêm
                </button>
              </div>
              {amendments.map((a, i) => (
                <AmendmentRow key={i} amendment={a} index={i} onChange={handleAmendmentChange} onRemove={handleAmendmentRemove} />
              ))}
            </div>
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
            {/* Văn bản sửa đổi */}
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-500">Văn bản sửa đổi, bổ sung</span>
                <button type="button" onClick={() => setAmendments((prev) => [...prev, { ...EMPTY_AMENDMENT }])}
                  className={`${btnCls} inline-flex items-center gap-1 text-[11px] border border-zinc-200 dark:border-white/[0.09]`}>
                  <Plus className="h-3 w-3" /> Thêm
                </button>
              </div>
              {amendments.map((a, i) => (
                <AmendmentRow key={i} amendment={a} index={i} onChange={handleAmendmentChange} onRemove={handleAmendmentRemove} />
              ))}
            </div>
          </div>
          <div>
            <SectionHeader title="Bảo hiểm" />
            {renderGroup(DS_INSURANCE_KEYS)}
          </div>
        </div>
      )}

      {/* ═══ TIẾT KIỆM / GIẤY TỜ CÓ GIÁ ═══ */}
      {type === "tiet_kiem" && fields.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-white/[0.07]">
          {/* Subtype selector */}
          <div className="flex gap-3">
            {TK_SUBTYPES.map((st) => (
              <label key={st.value} className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="tk_subtype" value={st.value}
                  checked={(props._subtype || "ttk") === st.value}
                  onChange={() => setProps((p) => ({ ...p, _subtype: st.value }))}
                  className="h-3.5 w-3.5 border-zinc-300 text-amber-600 focus:ring-amber-500/30" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{st.label}</span>
              </label>
            ))}
          </div>
          {/* GTCG: paper type dropdown */}
          {props._subtype === "gtcg" && (
            <label className="block">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Loại giấy tờ có giá</span>
              <select value={props.paper_type ?? ""} onChange={(e) => setProps((p) => ({ ...p, paper_type: e.target.value }))} className={inputCls}>
                <option value="">— Chọn —</option>
                {GTCG_PAPER_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
              </select>
            </label>
          )}
          {/* Remaining fields — hide GTCG-only fields when subtype is TTK */}
          <div className="grid grid-cols-2 gap-3">
            {fields
              .filter((f) => f.key !== "_subtype" && f.key !== "paper_type")
              .filter((f) => props._subtype === "gtcg" || !GTCG_ONLY_KEYS.has(f.key))
              .map((f) => renderField(f.key, f.label))}
          </div>
        </div>
      )}

      {/* ═══ Other types: flat grid (tai_san_khac) ═══ */}
      {type !== "qsd_dat" && type !== "dong_san" && type !== "tiet_kiem" && fields.length > 0 && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200 dark:border-white/[0.07]">
          {fields.map((f) => renderField(f.key, f.label))}
        </div>
      )}

      {/* Save/Cancel */}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={handleSave} disabled={saving}
          className={`${btnCls} bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-sm`}>
          {saving ? "..." : initial ? "Cập nhật" : "Thêm"}
        </button>
        <button type="button" onClick={onCancel} className={`${btnCls} border border-zinc-200 dark:border-white/[0.09]`}>
          Hủy
        </button>
      </div>
    </div>
  );
}

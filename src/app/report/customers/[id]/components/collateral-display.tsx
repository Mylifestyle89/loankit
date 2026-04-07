"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import {
  COLLATERAL_TYPES, PROPERTY_LABELS, formatValue, fmtNumber,
  type OwnerEntry, type CollateralItem,
} from "./collateral-config";
import { CollateralForm } from "./collateral-form";

/* ── Display groups for PropertyGrid ── */
const QSD_DISPLAY_GROUPS = [
  { label: "Thông tin giấy chứng nhận", keys: new Set(["certificate_name", "serial", "issuing_authority", "certificate_issue_date", "registry_number"]) },
  { label: "Thông tin đất", keys: new Set(["land_address", "land_area", "lot_number", "map_sheet", "land_purpose", "land_origin", "land_use_term", "land_value", "shared_area", "private_area", "ownership_form", "land_type_1", "land_unit_price_1", "land_value_1", "land_type_2", "land_unit_price_2", "land_value_2", "land_type_3", "land_unit_price_3", "land_value_3"]) },
  { label: "Tài sản gắn liền với đất", keys: new Set(["house_type", "construction_area", "floor_area", "house_structure", "house_ownership", "house_level", "floor_number", "house_value", "year_built", "initial_construction_value", "other_construction", "other_construction_value", "surface_rights_doc"]) },
  { label: "Giá trị & Định giá", keys: new Set(["max_credit_ratio_land", "max_credit_ratio_attached", "max_obligation", "max_obligation_in_words", "loan_to_value_ratio", "revaluation_period", "owner_borrower_relationship"]) },
  { label: "Hợp đồng bảo đảm", keys: new Set(["mortgage_name", "mortgage_contract", "mortgage_date", "guarantee_registry_place", "collateral_category", "appraisal_purpose"]) },
  { label: "Trạng thái", keys: new Set(["insurance_status", "asset_usage_status", "advantage_summary"]) },
];

const DS_DISPLAY_GROUPS = [
  { label: "Thông tin phương tiện", keys: new Set(["brand", "model_code", "engine_number", "chassis_number", "color", "license_plate", "seat_count", "manufacture_year"]) },
  { label: "Giấy tờ đăng ký", keys: new Set(["registration_number", "registration_date", "registration_place"]) },
  { label: "Hợp đồng bảo đảm", keys: new Set(["mortgage_name", "mortgage_contract", "mortgage_date", "guarantee_registry_place"]) },
  { label: "Bảo hiểm", keys: new Set(["insurance_status", "insurance_amount", "insurance_renewal_date"]) },
  { label: "Giá trị & Định giá", keys: new Set(["max_obligation", "max_obligation_in_words", "loan_to_value_ratio", "collateral_category", "appraisal_purpose", "asset_usage_status", "advantage_summary", "owner_borrower_relationship"]) },
];

/* ── PropertyGrid: renders collateral detail in grouped layout ── */
function PropertyGrid({ properties, collateralType }: { properties: Record<string, string>; collateralType: string }) {
  const INTERNAL_KEYS = new Set(["_owners", "_amendments"]);
  const entries = Object.entries(properties).filter(([k, v]) => v && !INTERNAL_KEYS.has(k));
  if (entries.length === 0) return null;

  // Parse owners & amendments if present
  let parsedOwners: OwnerEntry[] = [];
  try { parsedOwners = JSON.parse(properties._owners ?? "[]"); } catch { /* ignore */ }
  type AmendmentDisplay = { name: string; number?: string; date: string };
  let parsedAmendments: AmendmentDisplay[] = [];
  try { parsedAmendments = JSON.parse(properties._amendments ?? "[]"); } catch { /* ignore */ }

  const isQsd = collateralType === "qsd_dat";
  const isDs = collateralType === "dong_san";
  const groups = isQsd ? QSD_DISPLAY_GROUPS : isDs ? DS_DISPLAY_GROUPS : null;

  // Flat grid for types without groups
  if (!groups) {
    return (
      <div className="grid grid-cols-2 gap-x-8 gap-y-5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{PROPERTY_LABELS[k] ?? k}</span>
            <span className="text-[13.5px] font-medium text-zinc-900 dark:text-zinc-100">{formatValue(k, v)}</span>
          </div>
        ))}
      </div>
    );
  }

  const usedKeys = new Set<string>(["_owners", "_amendments"]);
  return (
    <div className="space-y-8">
      {/* Owners */}
      {parsedOwners.length > 0 && (
        <div className="border-b border-zinc-200/60 dark:border-white/[0.08] pb-6">
          <h5 className="text-[12px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-4">Chủ sở hữu tài sản</h5>
          <div className="space-y-3">
            {parsedOwners.map((o, i) => (
              <div key={i} className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-lg bg-zinc-50/60 dark:bg-white/[0.02] p-3">
                {o.name && <div className="flex flex-col gap-0.5"><span className="text-[11px] text-zinc-500">Tên</span><span className="text-[13px] font-medium">{o.name}</span></div>}
                {o.id_type && <div className="flex flex-col gap-0.5"><span className="text-[11px] text-zinc-500">Loại giấy tờ</span><span className="text-[13px] font-medium">{o.id_type}</span></div>}
                {o.cccd && <div className="flex flex-col gap-0.5"><span className="text-[11px] text-zinc-500">CCCD/CMND</span><span className="text-[13px] font-medium">{o.cccd}</span></div>}
                {o.cccd_place && <div className="flex flex-col gap-0.5"><span className="text-[11px] text-zinc-500">Nơi cấp</span><span className="text-[13px] font-medium">{o.cccd_place}</span></div>}
                {o.cccd_date && <div className="flex flex-col gap-0.5"><span className="text-[11px] text-zinc-500">Ngày cấp</span><span className="text-[13px] font-medium">{o.cccd_date}</span></div>}
                {o.cmnd_old && <div className="flex flex-col gap-0.5"><span className="text-[11px] text-zinc-500">CMND cũ</span><span className="text-[13px] font-medium">{o.cmnd_old}</span></div>}
                {o.birth_year && <div className="flex flex-col gap-0.5"><span className="text-[11px] text-zinc-500">Năm sinh</span><span className="text-[13px] font-medium">{o.birth_year}</span></div>}
                {o.phone && <div className="flex flex-col gap-0.5"><span className="text-[11px] text-zinc-500">Điện thoại</span><span className="text-[13px] font-medium">{o.phone}</span></div>}
                {o.address && <div className="col-span-2 flex flex-col gap-0.5"><span className="text-[11px] text-zinc-500">Nơi thường trú</span><span className="text-[13px] font-medium">{o.address}</span></div>}
                {o.current_address && <div className="col-span-2 flex flex-col gap-0.5"><span className="text-[11px] text-zinc-500">Địa chỉ hiện tại</span><span className="text-[13px] font-medium">{o.current_address}</span></div>}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Amendments */}
      {parsedAmendments.length > 0 && (
        <div className="border-b border-zinc-200/60 dark:border-white/[0.08] pb-6">
          <h5 className="text-[12px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-4">Văn bản sửa đổi, bổ sung</h5>
          <div className="space-y-2">
            {parsedAmendments.map((a, i) => (
              <div key={i} className="text-[13px] text-zinc-800 dark:text-zinc-200">
                {i + 1}. {a.name}{a.number ? ` số ${a.number}` : ""}{a.date ? ` ngày ${a.date}` : ""}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Grouped fields */}
      {groups.map((group) => {
        const groupEntries = entries.filter(([k]) => group.keys.has(k) && !usedKeys.has(k));
        if (groupEntries.length === 0) return null;
        groupEntries.forEach(([k]) => usedKeys.add(k));
        return (
          <div key={group.label} className="border-b border-zinc-200/60 dark:border-white/[0.08] pb-6 last:border-0 last:pb-0">
            <h5 className="text-[12px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-4">{group.label}</h5>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              {groupEntries.map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{PROPERTY_LABELS[k] ?? k}</span>
                  <span className="text-[13.5px] font-medium text-zinc-900 dark:text-zinc-100">{formatValue(k, v)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {/* Remaining */}
      {(() => {
        const remaining = entries.filter(([k]) => !usedKeys.has(k));
        if (remaining.length === 0) return null;
        return (
          <div>
            <h5 className="text-[12px] font-bold text-zinc-500 uppercase tracking-wider mb-4">Khác</h5>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              {remaining.map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{PROPERTY_LABELS[k] ?? k}</span>
                  <span className="text-[13.5px] font-medium text-zinc-900 dark:text-zinc-100">{formatValue(k, v)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ── CollateralRow: expandable card with edit/delete ── */
export function CollateralRow({ item, customerId, onRefresh }: {
  item: CollateralItem; customerId: string; onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const typeLabel = COLLATERAL_TYPES.find((t) => t.value === item.collateral_type)?.label ?? item.collateral_type;

  async function handleDelete() {
    if (!confirm("Xóa tài sản bảo đảm này?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/customers/${customerId}/collaterals/${item.id}`, { method: "DELETE" });
      onRefresh();
    } finally { setDeleting(false); }
  }

  if (editing) {
    return <CollateralForm customerId={customerId} initial={item}
      onSaved={() => { setEditing(false); onRefresh(); }} onCancel={() => setEditing(false)} />;
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50/60 dark:bg-white/[0.02]">
        <button type="button" onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] transition-colors shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4 text-brand-500" /> : <ChevronRight className="h-4 w-4 text-zinc-400" />}
        </button>
        <button type="button" onClick={() => setExpanded(!expanded)} className="flex-1 flex items-center gap-4 min-w-0 text-left">
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate block">{item.name}</span>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{typeLabel}</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 shrink-0 text-right">
            <div>
              <span className="text-[10px] uppercase text-zinc-400 block mb-0.5">Giá trị</span>
              <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200">
                {item.total_value ? fmtNumber(String(item.total_value)) + " đ" : "—"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-zinc-400 block mb-0.5">NVBĐ</span>
              <span className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
                {item.obligation ? fmtNumber(String(item.obligation)) + " đ" : "—"}
              </span>
            </div>
          </div>
        </button>
        <div className="flex gap-1 shrink-0">
          <button type="button" onClick={() => setEditing(true)} className="p-1.5 rounded-md hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] transition-colors">
            <Pencil className="h-3.5 w-3.5 text-zinc-400" />
          </button>
          <button type="button" onClick={handleDelete} disabled={deleting} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-zinc-100 dark:border-white/[0.05] px-5 py-4">
          <PropertyGrid properties={item.properties} collateralType={item.collateral_type} />
        </div>
      )}
    </div>
  );
}

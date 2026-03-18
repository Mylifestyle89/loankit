"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { btnCls } from "./shared-form-styles";
import { DropdownOptionsProvider } from "@/lib/hooks/dropdown-options-context";
import { type CollateralItem } from "./collateral-config";
import { CollateralForm } from "./collateral-form";
import { CollateralRow } from "./collateral-display";
import { DocumentScannerDialog } from "./document-scanner-dialog";
import type { DocumentType } from "@/services/ocr-document-prompts";

export function CustomerCollateralSection({ customerId }: { customerId: string }) {
  const [items, setItems] = useState<CollateralItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanPrefill, setScanPrefill] = useState<Partial<CollateralItem> | undefined>();

  /** Map OCR fields to collateral pre-fill data */
  function handleScanConfirm({ documentType, fields }: { documentType: string; fields: Record<string, string> }) {
    const typeMap: Record<string, string> = { land_cert: "qsd_dat", savings_book: "stk", vehicle_reg: "dong_san" };
    const collateralType = typeMap[documentType] ?? "qsd_dat";
    const props: Record<string, string> = {};

    if (documentType === "land_cert") {
      props.serial = fields.certificate_number ?? "";
      props.land_address = fields.land_address ?? "";
      props.land_area = fields.land_area_m2 ?? "";
      props.land_purpose = fields.land_use_purpose ?? "";
      props.land_use_term = fields.land_use_duration ?? "";
      props.certificate_issue_date = fields.issued_date ?? "";
      props.lot_number = fields.lot_number ?? "";
      props.map_sheet = fields.map_sheet ?? "";
      props.land_origin = fields.land_origin ?? "";
    } else if (documentType === "savings_book") {
      props.book_number = fields.book_number ?? "";
      props.bank_name = fields.bank_name ?? "";
      props.maturity_date = fields.maturity_date ?? "";
    } else if (documentType === "vehicle_reg") {
      props.plate_number = fields.plate_number ?? "";
      props.brand_model = fields.brand_model ?? "";
      props.frame_number = fields.frame_number ?? "";
      props.engine_number = fields.engine_number ?? "";
    }

    setScanPrefill({
      collateral_type: collateralType,
      name: fields.owner_name ?? "",
      properties: props,
    } as Partial<CollateralItem>);
    setShowForm(true);
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/customers/${customerId}/collaterals`);
    const data = await res.json();
    if (data.ok) setItems(data.collaterals ?? []);
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
    <DropdownOptionsProvider prefix="collateral.">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Tài sản bảo đảm ({items.length})</h3>
          <div className="flex gap-2">
            <button type="button" onClick={() => setScannerOpen(true)}
              className={`${btnCls} inline-flex items-center gap-1.5 border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 hover:bg-violet-100`}>
              📷 Scan giấy tờ TS
            </button>
            <button type="button" onClick={() => { setScanPrefill(undefined); setShowForm(true); }}
              className={`${btnCls} inline-flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm shadow-violet-500/25 hover:brightness-110`}>
              <Plus className="h-3.5 w-3.5" /> Thêm TSBĐ
            </button>
          </div>
        </div>

        {showForm && (
          <CollateralForm customerId={customerId}
            initial={scanPrefill as CollateralItem | undefined}
            onSaved={() => { setShowForm(false); setScanPrefill(undefined); void load(); }}
            onCancel={() => { setShowForm(false); setScanPrefill(undefined); }} />
        )}

        <DocumentScannerDialog
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          allowedTypes={["land_cert", "savings_book", "vehicle_reg"]}
          onConfirm={handleScanConfirm}
        />

        {items.length === 0 && !showForm ? (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-8 text-center">
            <p className="text-sm text-zinc-400 dark:text-slate-500">Chưa có tài sản bảo đảm nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <CollateralRow key={item.id} item={item} customerId={customerId} onRefresh={load} />
            ))}
          </div>
        )}
      </div>
    </DropdownOptionsProvider>
  );
}

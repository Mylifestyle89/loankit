"use client";

import { SmartField } from "@/components/smart-field";
import { DropdownOptionsProvider } from "@/lib/hooks/dropdown-options-context";
import { AiPasteExtractor } from "@/components/ui/ai-paste-extractor";
import type { ExtractedCustomer } from "@/services/customer-docx-extraction.service";
import { CustomerCoBorrowerSection } from "./customer-co-borrower-section";
import { CustomerRelatedPersonSection } from "./customer-related-person-section";
import { DocumentScannerDialog } from "./document-scanner-dialog";
import { DocumentPARepeater, type DocumentPAEntry } from "./customer-documents-pa-repeater";
import { useLanguage } from "@/components/language-provider";
import { useGroupVisibility, isFieldVisible } from "@/lib/field-visibility/use-field-visibility";

const inputCls =
  "mt-1 w-full rounded-md border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] text-zinc-900 dark:text-slate-100 px-3 py-2 shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";

/** Auto-insert "/" separators as user types a date in dd/mm/yyyy format */
function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

type FormState = {
  customer_code: string;
  customer_name: string;
  customer_type: string;
  address: string;
  main_business: string;
  charter_capital: string | number;
  legal_representative_name: string;
  legal_representative_title: string;
  organization_type: string;
  cccd: string;
  cccd_old: string;
  cccd_issued_date: string;
  cccd_issued_place: string;
  date_of_birth: string;
  phone: string;
  bank_account: string;
  bank_name: string;
  gender: string;
  cic_product_name: string;
  cic_product_code: string;
  occupation: string;
  nationality: string;
  id_type: string;
};

type Props = {
  customerId: string;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  documentsPa: DocumentPAEntry[];
  setDocumentsPa: React.Dispatch<React.SetStateAction<DocumentPAEntry[]>>;
  infoSubTab: "general" | "co-borrower" | "related";
  setInfoSubTab: (tab: "general" | "co-borrower" | "related") => void;
  saving: boolean;
  saved: boolean;
  scannerOpen: boolean;
  setScannerOpen: (open: boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
};

export function CustomerInfoForm({
  customerId,
  form,
  setForm,
  documentsPa,
  setDocumentsPa,
  infoSubTab,
  setInfoSubTab,
  saving,
  saved,
  scannerOpen,
  setScannerOpen,
  handleSubmit,
}: Props) {
  const { t } = useLanguage();
  const visibilityData = { customer_type: form.customer_type };
  const showCorporate = useGroupVisibility("customer.corporate_fields", visibilityData);
  const showIndividual = useGroupVisibility("customer.individual_fields", visibilityData);
  const showScanButton = isFieldVisible("customer.scan_button", visibilityData);

  return (
    <div className="space-y-4">
      {/* Info subtabs */}
      <div className="flex gap-1">
        {([
          { key: "general", label: "Thông tin chung" },
          { key: "co-borrower", label: "Người đồng vay" },
          { key: "related", label: "Người liên quan" },
        ] as const).map((st) => (
          <button
            key={st.key}
            type="button"
            onClick={() => setInfoSubTab(st.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              infoSubTab === st.key
                ? "bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                : "text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.05]"
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Subtab: Thông tin chung */}
      {infoSubTab === "general" && (
        <>
        <AiPasteExtractor
          entityType="customer"
          onExtracted={(data: Partial<ExtractedCustomer>) => {
            setForm((prev) => ({
              ...prev,
              ...(data.customer_name && { customer_name: data.customer_name }),
              ...(data.cccd && { cccd: data.cccd }),
              ...(data.cccd_old && { cccd_old: data.cccd_old }),
              ...(data.cccd_issued_date && { cccd_issued_date: data.cccd_issued_date }),
              ...(data.cccd_issued_place && { cccd_issued_place: data.cccd_issued_place }),
              ...(data.date_of_birth && { date_of_birth: data.date_of_birth }),
              ...(data.gender && { gender: data.gender }),
              ...(data.phone && { phone: data.phone }),
              ...(data.address && { address: data.address }),
              ...(data.bank_account && { bank_account: data.bank_account }),
              ...(data.bank_name && { bank_name: data.bank_name }),
            }));
          }}
          placeholder="Dán mục 1. Thông tin khách hàng từ BCĐX / HĐTD vào đây..."
        />
        <DropdownOptionsProvider prefix="customer.">
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl space-y-4 rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-6 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Loại KH:</span>
            <div className="inline-flex items-center rounded-full border border-zinc-200 dark:border-white/[0.09] p-0.5">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, customer_type: "individual" }))}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  form.customer_type === "individual"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                    : "text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
                }`}
              >
                Cá nhân
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, customer_type: "corporate" }))}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  form.customer_type === "corporate"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                    : "text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
                }`}
              >
                Doanh nghiệp
              </button>
            </div>
            {showScanButton && (
              <button type="button" onClick={() => setScannerOpen(true)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-brand-200 dark:border-brand-500/30 bg-brand-100 dark:bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors">
                📷 Scan tài liệu
              </button>
            )}
          </div>
          <label className="block">
            <span className="text-sm font-medium">{t("customers.code")} *</span>
            <SmartField fieldKey="customer.customer_code" value={form.customer_code} onChange={(val) => setForm((p) => ({ ...p, customer_code: val }))} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t("customers.name")} *</span>
            <SmartField fieldKey="customer.customer_name" value={form.customer_name} onChange={(val) => setForm((p) => ({ ...p, customer_name: val }))} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t("customers.address")}</span>
            <SmartField fieldKey="customer.address" value={form.address} onChange={(val) => setForm((p) => ({ ...p, address: val }))} className={inputCls} />
          </label>
          {showCorporate && (
            <>
              <label className="block">
                <span className="text-sm font-medium">Ngành nghề SXKD</span>
                <SmartField fieldKey="customer.main_business" value={form.main_business} onChange={(val) => setForm((p) => ({ ...p, main_business: val }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Vốn điều lệ</span>
                <SmartField fieldKey="customer.charter_capital" value={String(form.charter_capital)} onChange={(val) => setForm((p) => ({ ...p, charter_capital: val }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Người đại diện pháp luật</span>
                <SmartField fieldKey="customer.legal_representative_name" value={form.legal_representative_name} onChange={(val) => setForm((p) => ({ ...p, legal_representative_name: val }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Chức vụ</span>
                <SmartField fieldKey="customer.legal_representative_title" value={form.legal_representative_title} onChange={(val) => setForm((p) => ({ ...p, legal_representative_title: val }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Loại hình tổ chức</span>
                <SmartField fieldKey="customer.organization_type" value={form.organization_type} onChange={(val) => setForm((p) => ({ ...p, organization_type: val }))} className={inputCls} />
              </label>
            </>
          )}
          {showIndividual && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <label className="block">
                <span className="text-sm font-medium">Danh xưng</span>
                <SmartField fieldKey="customer.gender" value={form.gender} onChange={(val) => setForm((p) => ({ ...p, gender: val }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Năm sinh</span>
                <SmartField fieldKey="customer.date_of_birth" value={form.date_of_birth} onChange={(val) => setForm((p) => ({ ...p, date_of_birth: val }))} className={inputCls} placeholder="1990" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Loại giấy tờ tùy thân</span>
                <SmartField fieldKey="customer.id_type" value={form.id_type} onChange={(val) => setForm((p) => ({ ...p, id_type: val }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Số CCCD/CMND</span>
                <SmartField fieldKey="customer.cccd" value={form.cccd} onChange={(val) => setForm((p) => ({ ...p, cccd: val }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Ngày cấp</span>
                <SmartField fieldKey="customer.cccd_issued_date" value={form.cccd_issued_date} onChange={(val) => setForm((p) => ({ ...p, cccd_issued_date: formatDateInput(val) }))} className={inputCls} placeholder="dd/mm/yyyy" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Nơi cấp</span>
                <SmartField fieldKey="customer.cccd_issued_place" value={form.cccd_issued_place} onChange={(val) => setForm((p) => ({ ...p, cccd_issued_place: val }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">CMND cũ</span>
                <SmartField fieldKey="customer.cccd_old" value={form.cccd_old} onChange={(val) => setForm((p) => ({ ...p, cccd_old: val }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Số điện thoại</span>
                <SmartField fieldKey="customer.phone" value={form.phone} onChange={(val) => setForm((p) => ({ ...p, phone: val }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Số tài khoản</span>
                <SmartField fieldKey="customer.bank_account" value={form.bank_account} onChange={(val) => setForm((p) => ({ ...p, bank_account: val }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Nơi mở tài khoản</span>
                <SmartField fieldKey="customer.bank_name" value={form.bank_name} onChange={(val) => setForm((p) => ({ ...p, bank_name: val }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Nghề nghiệp</span>
                <SmartField fieldKey="customer.occupation" value={form.occupation} onChange={(val) => setForm((p) => ({ ...p, occupation: val }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Quốc tịch</span>
                <SmartField fieldKey="customer.nationality" value={form.nationality} onChange={(val) => setForm((p) => ({ ...p, nationality: val }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Tên sản phẩm TTTD</span>
                <SmartField fieldKey="customer.cic_product_name" value={form.cic_product_name} onChange={(val) => setForm((p) => ({ ...p, cic_product_name: val }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Mã sản phẩm TTTD</span>
                <SmartField fieldKey="customer.cic_product_code" value={form.cic_product_code} onChange={(val) => setForm((p) => ({ ...p, cic_product_code: val }))} className={inputCls} />
              </label>
            </div>
          )}

          {/* Tài liệu liên quan PA */}
          <div className="border-t border-zinc-200 dark:border-white/[0.07] pt-4">
            <h3 className="text-sm font-semibold mb-3">Tài liệu liên quan PA</h3>
            <DocumentPARepeater documents={documentsPa} onChange={setDocumentsPa} />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="cursor-pointer rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white shadow-sm shadow-brand-500/25 transition-all duration-200 hover:shadow-md hover:shadow-brand-500/30 hover:brightness-110 disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
            {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Đã lưu thành công</span>}
          </div>
        </form>
        </DropdownOptionsProvider>
        <DocumentScannerDialog
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          allowedTypes={["cccd"]}
          onConfirm={({ fields }) => {
            setForm((prev) => ({
              ...prev,
              customer_name: fields.full_name || prev.customer_name,
              cccd: fields.cccd_number || prev.cccd,
              date_of_birth: fields.date_of_birth || prev.date_of_birth,
              cccd_issued_date: fields.issued_date || prev.cccd_issued_date,
              cccd_issued_place: fields.issued_place || prev.cccd_issued_place,
              address: fields.place_of_residence || prev.address,
            }));
          }}
        />
        </>
      )}

      {/* Subtab: Người đồng vay */}
      {infoSubTab === "co-borrower" && <CustomerCoBorrowerSection customerId={customerId} />}

      {/* Subtab: Người liên quan */}
      {infoSubTab === "related" && <CustomerRelatedPersonSection customerId={customerId} />}
    </div>
  );
}

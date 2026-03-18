"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Download, Loader2 } from "lucide-react";

import { BaseModal } from "@/components/ui/BaseModal";
import { useLanguage } from "@/components/language-provider";

type TemplateKey = "bcdx" | "giay_nhan_no" | "danh_muc_ho_so" | "in_unc" | "cam_ket_bo_sung_chung_tu";

const TEMPLATES: { key: TemplateKey; label: string; description: string }[] = [
  { key: "bcdx", label: "Báo cáo đề xuất giải ngân", description: "Mẫu 2268.09" },
  { key: "giay_nhan_no", label: "Giấy nhận nợ", description: "Mẫu 2268.10" },
  { key: "danh_muc_ho_so", label: "Danh mục hồ sơ vay vốn", description: "Mẫu 2899.01" },
  { key: "in_unc", label: "In UNC", description: "Mẫu in ủy nhiệm chi (per đơn vị thụ hưởng)" },
  { key: "cam_ket_bo_sung_chung_tu", label: "Cam kết bổ sung chứng từ", description: "Cam kết bổ sung chứng từ giải ngân" },
];

// Override fields per template (only fields NOT in DB)
type OverrideField = { key: string; label: string; placeholder?: string; type?: "currency" };

const OVERRIDE_FIELDS: Record<TemplateKey, OverrideField[]> = {
  bcdx: [
    { key: "Mã CN", label: "Mã chi nhánh", placeholder: "VD: CN01" },
    { key: "Tên gọi in hoa", label: "Tên chi nhánh (in hoa)", placeholder: "VD: CHI NHÁNH TỈNH LÂM ĐỒNG" },
    { key: "HĐTD.Hạn mức bảo lãnh", label: "Hạn mức bảo lãnh" },
    { key: "GN.Số dư L/C", label: "Số dư L/C", placeholder: "0" },
    { key: "GN.Số dư bảo lãnh", label: "Số dư bảo lãnh", placeholder: "0" },
    { key: "HĐTD.Lãi suất quá hạn", label: "Lãi suất nợ quá hạn" },
    { key: "HĐTD.Lãi suất chậm trả", label: "Lãi chậm trả" },
    { key: "Tổng giá trị TSBĐ", label: "Tổng giá trị tài sản bảo đảm", placeholder: "VD: 3.588.940.000", type: "currency" },
    { key: "Phạm vi bảo đảm", label: "Phạm vi bảo đảm", placeholder: "VD: 5.000.000.000", type: "currency" },
    { key: "Địa danh", label: "Địa danh", placeholder: "VD: Lâm Đồng" },
  ],
  giay_nhan_no: [
    { key: "Mã CN", label: "Mã chi nhánh" },
    { key: "Tên chi nhánh/PGD", label: "Tên chi nhánh/PGD" },
    { key: "Loại giấy tờ pháp lý", label: "Loại giấy tờ pháp lý", placeholder: "Giấy CN ĐKKD" },
    { key: "Số ĐKKD", label: "Số ĐKKD" },
    { key: "Nơi cấp ĐKKD", label: "Nơi cấp ĐKKD" },
    { key: "Ngày cấp ĐKKD", label: "Ngày cấp ĐKKD", placeholder: "dd/mm/yyyy" },
    { key: "Danh xưng", label: "Danh xưng", placeholder: "Ông / Bà" },
    { key: "Loại giấy tờ tùy thân", label: "Loại giấy tờ tùy thân", placeholder: "CMND / CCCD" },
    { key: "CMND", label: "Số CMND/CCCD" },
    { key: "Ngày cấp", label: "Ngày cấp CMND" },
    { key: "Nơi cấp", label: "Nơi cấp CMND" },
    { key: "Giấy tờ ủy quyền", label: "Giấy tờ ủy quyền", placeholder: "(nếu có)" },
    { key: "GN.Lãi suất vay", label: "Lãi suất vay (%/năm)" },
    { key: "HĐTD.Lãi suất quá hạn", label: "Lãi suất quá hạn" },
    { key: "HĐTD.Lãi suất chậm trả", label: "Lãi suất chậm trả" },
    { key: "Địa danh", label: "Địa danh", placeholder: "VD: Lâm Đồng" },
  ],
  danh_muc_ho_so: [
    { key: "Số điện thoại", label: "Số điện thoại" },
    { key: "Tên người dùng", label: "Tên người giao/nhận" },
  ],
  in_unc: [],
  cam_ket_bo_sung_chung_tu: [
    { key: "Loại giấy tờ tùy thân", label: "Loại giấy tờ tùy thân", placeholder: "CMND / CCCD" },
    { key: "CMND", label: "Số CMND/CCCD" },
    { key: "nơi cấp", label: "Nơi cấp" },
    { key: "ngày cấp", label: "Ngày cấp", placeholder: "dd/mm/yyyy" },
    { key: "Tên chi nhánh/PGD", label: "Tên chi nhánh/PGD" },
  ],
};

type Props = {
  loanId: string;
  disbursementId: string;
  onClose: () => void;
};

const STORAGE_KEY_PREFIX = "disbursement-report-overrides";

function loadSavedOverrides(loanId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}:${loanId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOverrides(loanId: string, overrides: Record<string, string>) {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}:${loanId}`, JSON.stringify(overrides));
  } catch { /* quota exceeded — silently ignore */ }
}

export function DisbursementReportModal({ loanId, disbursementId, onClose }: Props) {
  const { t } = useLanguage();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("bcdx");
  const [overrides, setOverrides] = useState<Record<string, string>>(() => loadSavedOverrides(loanId));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Persist overrides to localStorage on change
  useEffect(() => {
    saveOverrides(loanId, overrides);
  }, [loanId, overrides]);

  const overrideFields = OVERRIDE_FIELDS[selectedTemplate];

  const handleOverrideChange = useCallback((key: string, value: string, isCurrency?: boolean) => {
    if (isCurrency) {
      // Strip non-digits, format with dot separators
      const digits = value.replace(/\D/g, "");
      const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      setOverrides((prev) => ({ ...prev, [key]: formatted }));
    } else {
      setOverrides((prev) => ({ ...prev, [key]: value }));
    }
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/loans/${loanId}/disbursements/${disbursementId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey: selectedTemplate, overrides }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Tạo báo cáo thất bại");
      }

      // Download the DOCX file
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : "report.docx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <BaseModal
      open
      onClose={onClose}
      title={t("disbursements.generateReport") ?? "Tạo báo cáo giải ngân"}
      maxWidthClassName="max-w-xl"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-zinc-300 dark:border-white/10 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-slate-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
          >
            {t("common.cancel") ?? "Hủy"}
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="cursor-pointer flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {generating ? "Đang tạo..." : (t("disbursements.generateReport") ?? "Tạo báo cáo")}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Template selection */}
        <fieldset>
          <legend className="text-sm font-medium text-zinc-700 dark:text-slate-300 mb-2">
            Chọn mẫu báo cáo
          </legend>
          <div className="space-y-2">
            {TEMPLATES.map((tmpl) => (
              <label
                key={tmpl.key}
                className={`cursor-pointer flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  selectedTemplate === tmpl.key
                    ? "border-violet-500 bg-violet-50/30 dark:bg-violet-900/20 dark:border-violet-500/60"
                    : "border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20"
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  value={tmpl.key}
                  checked={selectedTemplate === tmpl.key}
                  onChange={() => setSelectedTemplate(tmpl.key)}
                  className="accent-violet-600"
                />
                <div>
                  <div className="text-sm font-medium text-zinc-800 dark:text-slate-200">{tmpl.label}</div>
                  <div className="text-xs text-zinc-500 dark:text-slate-400">{tmpl.description}</div>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Override fields */}
        {overrideFields.length > 0 && (
          <fieldset>
            <legend className="text-sm font-medium text-zinc-700 dark:text-slate-300 mb-2">
              Thông tin bổ sung
            </legend>
            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
              {overrideFields.map((field) => (
                <div key={field.key} className={overrideFields.length <= 4 ? "col-span-2 sm:col-span-1" : ""}>
                  <label className="block text-xs text-zinc-500 dark:text-slate-400 mb-1">{field.label}</label>
                  <input
                    type="text"
                    value={overrides[field.key] ?? ""}
                    onChange={(e) => handleOverrideChange(field.key, e.target.value, field.type === "currency")}
                    placeholder={field.placeholder}
                    className="w-full rounded-md border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-sm text-zinc-800 dark:text-slate-200 placeholder:text-zinc-400 dark:placeholder:text-slate-500 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                  />
                </div>
              ))}
            </div>
          </fieldset>
        )}

        {/* Error message */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    </BaseModal>
  );
}

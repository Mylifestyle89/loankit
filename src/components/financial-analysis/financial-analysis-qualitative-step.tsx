"use client";

/**
 * financial-analysis-qualitative-step.tsx
 *
 * Step 3 UI for FinancialAnalysisModal: qualitative context input before AI analysis.
 */

import type { QualitativeContext } from "./financial-analysis-types";

type FieldCatalogItem = {
  field_key: string;
  label_vi: string;
  analysis_prompt?: string;
};

type Props = {
  qualitative: QualitativeContext;
  onQualitativeChange: (patch: Partial<QualitativeContext>) => void;
  analysisFields: FieldCatalogItem[];
};

const QUALITATIVE_FIELDS: Array<{
  key: keyof QualitativeContext;
  label: string;
  placeholder: string;
}> = [
  {
    key: "chatLuongHtk",
    label: "Chất lượng Hàng Tồn Kho",
    placeholder: "VD: HTK đa phần là thành phẩm có thể tiêu thụ ngay, tốc độ quay vòng tốt...",
  },
  {
    key: "congNoPhaiThu",
    label: "Chất lượng Công Nợ Phải Thu",
    placeholder: "VD: Phải thu tập trung vào 3-5 KH lớn, uy tín, tỷ lệ nợ xấu thấp...",
  },
  {
    key: "hanMucTinDung",
    label: "Hạn mức tín dụng đề xuất",
    placeholder: "VD: Đề xuất hạn mức 5 tỷ VND, kỳ hạn 12 tháng...",
  },
  {
    key: "ghiChu",
    label: "Ghi chú bổ sung",
    placeholder: "Thông tin khác cán bộ tín dụng muốn AI cân nhắc khi phân tích...",
  },
];

export function FinancialAnalysisQualitativeStep({ qualitative, onQualitativeChange, analysisFields }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Cung cấp thêm thông tin định tính để AI phân tích chính xác hơn (tuỳ chọn).
        Thông tin này được lưu lại khi bạn đóng và mở lại modal.
      </p>

      {analysisFields.length === 0 && (
        <div className="rounded-lg border border-brand-200 dark:border-brand-500/30 bg-brand-100 dark:bg-brand-500/10 px-4 py-3 text-sm text-brand-600 dark:text-brand-400">
          ⚠️ Không có field nào có{" "}
          <code className="font-mono text-xs">analysis_prompt</code>{" "}
          trong field catalog. Hãy thêm{" "}
          <code className="font-mono text-xs">analysis_prompt</code>{" "}
          cho các field cần phân tích trước khi sử dụng tính năng này.
        </div>
      )}

      <div className="space-y-3">
        {QUALITATIVE_FIELDS.map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {label}
            </label>
            <textarea
              value={qualitative[key]}
              onChange={(e) => onQualitativeChange({ [key]: e.target.value })}
              placeholder={placeholder}
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-200 dark:border-white/[0.09] bg-white dark:bg-white/[0.05] px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
            />
          </div>
        ))}
      </div>

      {analysisFields.length > 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.04] px-3 py-2.5">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            AI sẽ phân tích{" "}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {analysisFields.length}
            </span>{" "}
            field:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {analysisFields.map((f) => (
              <span
                key={f.field_key}
                className="rounded-full border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.07] px-2 py-0.5 text-[11px] text-slate-600 dark:text-slate-300"
              >
                {f.label_vi}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

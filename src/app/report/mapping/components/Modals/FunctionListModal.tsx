"use client";

import { X } from "lucide-react";
import { getDuplicateAliasGroups } from "@/lib/report/alias-utils";

type FunctionListModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** JSON string của alias map để quét trùng (tùy chọn) */
  aliasText?: string;
};

const FUNCTIONS = [
  {
    nameVi: "Tổng",
    nameEn: "sum",
    syntax: "sum(mảng giá trị)",
    desc: "Cộng tất cả số trong mảng (ví dụ tổng các dòng trong nhóm lặp).",
    example: "sum(ban_lanh_dao.ty_le_so_huu)",
  },
  {
    nameVi: "Trung bình",
    nameEn: "average",
    syntax: "average(mảng giá trị)",
    desc: "Tính trung bình cộng các số trong mảng.",
    example: "average(doanh_thu_theo_quy)",
  },
  {
    nameVi: "Nhỏ nhất",
    nameEn: "min",
    syntax: "min(mảng giá trị)",
    desc: "Lấy giá trị nhỏ nhất trong mảng số.",
    example: "min(gia_tri_ts)",
  },
  {
    nameVi: "Lớn nhất",
    nameEn: "max",
    syntax: "max(mảng giá trị)",
    desc: "Lấy giá trị lớn nhất trong mảng số.",
    example: "max(gia_tri_ts)",
  },
  {
    nameVi: "Biểu thức số học",
    nameEn: "evaluateExpression",
    syntax: "trường_A + trường_B | trường_A - trường_B | trường_A * trường_B | trường_A / trường_B",
    desc: "Tính toán từ các trường (field) bằng phép cộng, trừ, nhân, chia. Có thể dùng cả mã trường (technical key) và tên Alias. Dùng dấu ngoặc () khi cần.",
    example: "Doanh_thu - Chi_phí  hoặc  custom.doanh_thu.doanh_thu - custom.chi_phi.chi_phi",
  },
  {
    nameVi: "Làm tròn chuẩn",
    nameEn: "ROUND",
    syntax: "ROUND(giá_trị, số_chữ_số)",
    desc: "Làm tròn số theo cách chuẩn kiểu Excel.",
    example: "ROUND(Doanh_thu / 3, 2)",
  },
  {
    nameVi: "Làm tròn lên",
    nameEn: "ROUNDUP",
    syntax: "ROUNDUP(giá_trị, số_chữ_số)",
    desc: "Luôn làm tròn lên theo hướng ra xa số 0 (kiểu Excel).",
    example: "ROUNDUP(Tỷ_lệ * 100, 0)",
  },
  {
    nameVi: "Làm tròn xuống",
    nameEn: "ROUNDDOWN",
    syntax: "ROUNDDOWN(giá_trị, số_chữ_số)",
    desc: "Luôn làm tròn xuống theo hướng về số 0 (kiểu Excel).",
    example: "ROUNDDOWN(Tỷ_lệ * 100, 0)",
  },
  {
    nameVi: "Đọc số thành chữ",
    nameEn: "docso",
    syntax: "docso(giá_trị)",
    desc: "Đọc số thành chữ tiếng Việt (hỗ trợ cả thập phân).",
    example: "docso(12,05) → mười hai phẩy không năm",
  },
  {
    nameVi: "Đọc số có đơn vị",
    nameEn: "docsocodonvi",
    syntax: "docsocodonvi(giá_trị, \"đơn_vị\")",
    desc: "Đọc số thành chữ và nối thêm đơn vị, ví dụ đồng, %, ...",
    example: "docsocodonvi(1500000, \"đồng\") → một triệu năm trăm nghìn đồng",
  },
];

export function FunctionListModal({ isOpen, onClose, aliasText }: FunctionListModalProps) {
  if (!isOpen) return null;

  let duplicateGroups: Record<string, string[]> = {};
  try {
    if (aliasText?.trim()) {
      const aliasMap = JSON.parse(aliasText) as Record<string, unknown>;
      duplicateGroups = getDuplicateAliasGroups(aliasMap);
    }
  } catch {
    duplicateGroups = {};
  }
  const hasDuplicates = Object.keys(duplicateGroups).length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white dark:bg-[#141414]/90 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-blue-chill-200 dark:border-white/[0.07] bg-blue-chill-50 dark:bg-white/[0.04] px-4 py-3">
          <h2 className="text-lg font-semibold text-blue-chill-900 dark:text-slate-100">Danh sách hàm tính toán</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-blue-chill-600 dark:text-slate-300 hover:bg-blue-chill-200 dark:hover:bg-white/[0.07] hover:text-blue-chill-900 dark:hover:text-slate-100"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <p className="text-sm text-blue-chill-700 dark:text-slate-300">
            Các hàm dùng cho trường (field) hỗ trợ cả <strong>mã kỹ thuật</strong> và <strong>tên Alias</strong>.
            Trong biểu thức có thể gõ mã trường (ví dụ <code className="rounded bg-blue-chill-100 dark:bg-white/[0.06] px-1">custom.doanh_thu.doanh_thu</code>) hoặc tên Alias: nếu Alias có khoảng trắng (ví dụ &quot;Doanh thu thuần&quot;) thì trong công thức gõ bằng <strong>dấu gạch dưới</strong> (ví dụ <code className="rounded bg-blue-chill-100 dark:bg-white/[0.06] px-1">Doanh_thu_thuần</code>). Không nên đặt hai Alias trùng nhau (sau khi chuẩn hóa) để tránh lỗi công thức.
          </p>

          {hasDuplicates && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-900 mb-2">Cảnh báo: Alias trùng tên (cần chỉnh sửa)</h3>
              <p className="text-xs text-amber-800 mb-3">
                Các nhóm dưới đây có nhiều alias chuẩn hóa giống nhau. Nên giữ một tên duy nhất cho mỗi trường để công thức hoạt động đúng.
              </p>
              <ul className="space-y-2 text-sm">
                {Object.entries(duplicateGroups).map(([normalized, keys]) => (
                  <li key={normalized} className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium text-amber-900">{"\""}{normalized}{"\""}</span>
                    <span className="text-amber-700">→</span>
                    {keys.map((k) => (
                      <code key={k} className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">
                        {k}
                      </code>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-blue-chill-900 dark:text-slate-100 mb-3">Hàm tổng hợp (mảng)</h3>
            <ul className="space-y-4">
              {FUNCTIONS.filter((f) => ["sum", "average", "min", "max"].includes(f.nameEn)).map((f) => (
                <li key={f.nameEn} className="rounded-lg border border-blue-chill-100 dark:border-white/[0.07] bg-blue-chill-50/50 dark:bg-white/[0.04] p-3">
                  <div className="font-medium text-blue-chill-800 dark:text-slate-200">{f.nameVi}</div>
                  <div className="mt-1 text-xs font-sans text-blue-chill-600 dark:text-slate-300">{f.syntax}</div>
                  <p className="mt-1 text-sm text-blue-chill-700 dark:text-slate-300">{f.desc}</p>
                  {f.example && (
                    <p className="mt-1 text-xs text-blue-chill-600 dark:text-slate-400">Ví dụ: {f.example}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-blue-chill-900 dark:text-slate-100 mb-3">Biểu thức số học</h3>
            <div className="rounded-lg border border-blue-chill-100 dark:border-white/[0.07] bg-blue-chill-50/50 dark:bg-white/[0.04] p-3">
              {FUNCTIONS.filter((f) => ["evaluateExpression", "ROUND", "ROUNDUP", "ROUNDDOWN"].includes(f.nameEn)).map((f) => (
                <div key={f.nameEn}>
                  <div className="font-medium text-blue-chill-800 dark:text-slate-200">{f.nameVi}</div>
                  <div className="mt-1 text-xs font-sans text-blue-chill-600 dark:text-slate-300">{f.syntax}</div>
                  <p className="mt-1 text-sm text-blue-chill-700 dark:text-slate-300">{f.desc}</p>
                  <p className="mt-1 text-xs text-blue-chill-600 dark:text-slate-400">Ví dụ: {f.example}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-blue-chill-900 dark:text-slate-100 mb-3">Đọc số thành chữ</h3>
            <div className="rounded-lg border border-blue-chill-100 dark:border-white/[0.07] bg-blue-chill-50/50 dark:bg-white/[0.04] p-3">
              {FUNCTIONS.filter((f) => ["docso", "docsocodonvi"].includes(f.nameEn)).map((f) => (
                <div key={f.nameEn}>
                  <div className="font-medium text-blue-chill-800 dark:text-slate-200">{f.nameVi}</div>
                  <div className="mt-1 text-xs font-sans text-blue-chill-600 dark:text-slate-300">{f.syntax}</div>
                  <p className="mt-1 text-sm text-blue-chill-700 dark:text-slate-300">{f.desc}</p>
                  <p className="mt-1 text-xs text-blue-chill-600 dark:text-slate-400">Ví dụ: {f.example}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

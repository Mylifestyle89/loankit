import type { ValidationResponse } from "../types";

type ValidationResultPanelProps = {
  t: (key: string) => string;
  validation?: ValidationResponse["validation"];
};

export function ValidationResultPanel({ t, validation }: ValidationResultPanelProps) {
  const insights = (() => {
    if (!validation) return [];
    const list: Array<{ level: "ok" | "warn" | "error"; title: string; detail: string }> = [];
    const errors = Array.isArray(validation.errors) ? validation.errors : [];
    const warnings = Array.isArray(validation.warnings) ? validation.warnings : [];
    const isValid = Boolean(validation.is_valid);

    if (isValid) {
      list.push({
        level: "ok",
        title: "Mapping hợp lệ",
        detail: "Cấu hình mapping không có lỗi blocking và có thể tiếp tục build/export.",
      });
    } else {
      list.push({
        level: "error",
        title: "Mapping cần chỉnh sửa",
        detail: "Phát hiện lỗi cấu hình. Hãy kiểm tra các trường có thiếu map hoặc không đúng kiểu dữ liệu.",
      });
    }

    if ((validation.errors_count ?? 0) > 0) {
      list.push({
        level: "error",
        title: `${validation.errors_count} lỗi cần xử lý`,
        detail: "Một số trường có thể sai định dạng (ví dụ Date vs Text, Number vs Text) hoặc thiếu bắt buộc.",
      });
    }

    if ((validation.warnings_count ?? 0) > 0) {
      list.push({
        level: "warn",
        title: `${validation.warnings_count} cảnh báo`,
        detail: "Dữ liệu vẫn có thể chạy nhưng có rủi ro sai lệch khi xuất báo cáo thực tế.",
      });
    }

    const topErr = errors[0];
    if (topErr) {
      const detail = typeof topErr === "string" ? topErr : JSON.stringify(topErr);
      list.push({
        level: "error",
        title: "Chi tiết lỗi tiêu biểu",
        detail,
      });
    }
    const topWarn = warnings[0];
    if (topWarn) {
      const detail = typeof topWarn === "string" ? topWarn : JSON.stringify(topWarn);
      list.push({
        level: "warn",
        title: "Chi tiết cảnh báo tiêu biểu",
        detail,
      });
    }

    return list;
  })();

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#141414]/90 p-4">
      <h3 className="text-sm font-semibold dark:text-slate-100">{t("mapping.validationResult")}</h3>
      {validation ? (
        <div className="mt-3 space-y-2">
          {insights.map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              className={`rounded-lg border px-3 py-2 text-sm ${
                item.level === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : item.level === "warn"
                    ? "border-primary-200 bg-primary-50 text-primary-700"
                    : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              <p className="font-semibold">{item.title}</p>
              <p className="mt-0.5 text-xs opacity-90">{item.detail}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm text-zinc-500 dark:text-slate-300">{t("mapping.noValidation")}</p>
      )}
    </div>
  );
}

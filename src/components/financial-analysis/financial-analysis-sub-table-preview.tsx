import type { SubTable } from "@/lib/bctc-extractor";
import { fmtNum } from "./financial-analysis-utils";

// SubTablePreview: renders sub-tables (phaiThu, tonKho, phaiTra) with max 20 rows
export function SubTablePreview({ subTable }: { subTable: SubTable }) {
  if (!subTable.rows.length)
    return <p className="px-3 py-2 text-xs text-slate-400">Không có dữ liệu</p>;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-slate-50/80 dark:bg-white/[0.03] text-left">
          {subTable.headers.map((h) => (
            <th
              key={h}
              className="px-2 py-1.5 font-semibold text-slate-600 dark:text-slate-400 max-w-[140px] truncate"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {subTable.rows.slice(0, 20).map((row, i) => (
          <tr key={i} className="border-t border-slate-100 dark:border-white/[0.04]">
            {subTable.headers.map((h) => {
              const v = row[h];
              return (
                <td
                  key={h}
                  className={`px-2 py-1 max-w-[140px] truncate ${
                    typeof v === "number"
                      ? "text-right tabular-nums text-slate-700 dark:text-slate-200"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {typeof v === "number" ? fmtNum(v) : v ?? ""}
                </td>
              );
            })}
          </tr>
        ))}
        {subTable.rows.length > 20 && (
          <tr>
            <td
              colSpan={subTable.headers.length}
              className="px-2 py-1.5 text-center text-slate-400 dark:text-slate-500 italic"
            >
              ... và {subTable.rows.length - 20} dòng nữa
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

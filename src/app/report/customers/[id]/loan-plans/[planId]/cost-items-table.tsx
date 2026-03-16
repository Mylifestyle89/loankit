"use client";

import { Plus, Trash2 } from "lucide-react";
import { NumericInput } from "./numeric-input";

export type CostItem = { name: string; unit: string; qty: number; unitPrice: number; amount: number };

const cellCls = "px-2 py-1.5 border border-zinc-200 dark:border-white/[0.07] text-sm";
const inputCls = "w-full bg-transparent outline-none text-right tabular-nums";

export function CostItemsTable({
  items,
  onChange,
}: {
  items: CostItem[];
  onChange: (items: CostItem[]) => void;
}) {
  function updateItem(idx: number, field: keyof CostItem, raw: string) {
    const next = [...items];
    const item = { ...next[idx] };
    if (field === "name" || field === "unit") {
      (item as Record<string, unknown>)[field] = raw;
    } else {
      (item as Record<string, unknown>)[field] = Number(raw) || 0;
    }
    // Auto-calc amount
    item.amount = item.qty * item.unitPrice;
    next[idx] = item;
    onChange(next);
  }

  function addRow() {
    onChange([...items, { name: "", unit: "", qty: 0, unitPrice: 0, amount: 0 }]);
  }

  function removeRow(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  const totalAmount = items.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-zinc-50 dark:bg-white/[0.03] text-xs text-zinc-500">
            <th className={`${cellCls} text-left w-[30%]`}>Hạng mục</th>
            <th className={`${cellCls} text-center w-[10%]`}>ĐVT</th>
            <th className={`${cellCls} text-right w-[15%]`}>Số lượng</th>
            <th className={`${cellCls} text-right w-[20%]`}>Đơn giá</th>
            <th className={`${cellCls} text-right w-[20%]`}>Thành tiền</th>
            <th className={`${cellCls} w-[5%]`} />
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="hover:bg-violet-50/30 dark:hover:bg-violet-500/5">
              <td className={cellCls}>
                <input className="w-full bg-transparent outline-none" value={item.name} onChange={(e) => updateItem(idx, "name", e.target.value)} placeholder="Tên hạng mục" />
              </td>
              <td className={`${cellCls} text-center`}>
                <input className="w-full bg-transparent outline-none text-center" value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} placeholder="kg" />
              </td>
              <td className={cellCls}>
                <NumericInput className={inputCls} value={item.qty} onChange={(n) => updateItem(idx, "qty", String(n))} placeholder="0" />
              </td>
              <td className={cellCls}>
                <NumericInput className={inputCls} value={item.unitPrice} onChange={(n) => updateItem(idx, "unitPrice", String(n))} placeholder="0" />
              </td>
              <td className={`${cellCls} text-right tabular-nums font-medium`}>
                {item.amount.toLocaleString("vi-VN")}
              </td>
              <td className={`${cellCls} text-center`}>
                <button type="button" onClick={() => removeRow(idx)} className="text-zinc-400 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-zinc-50 dark:bg-white/[0.03] font-semibold">
            <td colSpan={4} className={`${cellCls} text-right`}>Tổng chi phí trực tiếp</td>
            <td className={`${cellCls} text-right tabular-nums`}>{totalAmount.toLocaleString("vi-VN")}</td>
            <td className={cellCls} />
          </tr>
        </tfoot>
      </table>
      <button
        type="button"
        onClick={addRow}
        className="mt-2 inline-flex items-center gap-1 rounded-lg border border-dashed border-zinc-300 dark:border-white/[0.1] px-3 py-1.5 text-xs text-zinc-500 hover:border-violet-300 hover:text-violet-600"
      >
        <Plus className="h-3 w-3" /> Thêm hạng mục
      </button>
    </div>
  );
}

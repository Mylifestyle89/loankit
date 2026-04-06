"use client";

import { Banknote, FileText, Shield, Wallet } from "lucide-react";

type KhcnProfileCardProps = {
  customer: {
    customer_name: string;
    customer_code: string;
    cccd: string | null;
    phone: string | null;
    address: string | null;
  };
  summary: {
    totalLoans: number;
    activeLoans: number;
    outstandingBalance: number;
    debtGroup: string | null;
    nearestMaturity: string | null;
    coBorrowerCount: number;
    totalCollateralValue: number;
    totalObligation: number;
  };
};

function fmtVND(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

function debtGroupStyle(group: string | null) {
  const n = Number(group);
  if (!group || n <= 1) return { bg: "bg-emerald-100 dark:bg-emerald-500/10", icon: "text-emerald-600 dark:text-emerald-400", text: "text-emerald-700 dark:text-emerald-400" };
  if (n === 2) return { bg: "bg-amber-100 dark:bg-amber-500/10", icon: "text-amber-600 dark:text-amber-400", text: "text-amber-700 dark:text-amber-400" };
  return { bg: "bg-red-100 dark:bg-red-500/10", icon: "text-red-600 dark:text-red-400", text: "text-red-700 dark:text-red-400" };
}

export function KhcnProfileCard({ customer, summary }: KhcnProfileCardProps) {
  const dg = debtGroupStyle(summary.debtGroup);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <h3 className="text-base font-bold text-zinc-900 dark:text-slate-100">{customer.customer_name}</h3>
          <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20">
            {customer.customer_code}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-zinc-500 dark:text-slate-400">
          {customer.cccd && <span>CCCD: <span className="text-zinc-700 dark:text-slate-300">{customer.cccd}</span></span>}
          {customer.phone && <span>SĐT: <span className="text-zinc-700 dark:text-slate-300">{customer.phone}</span></span>}
        </div>
        {customer.address && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">{customer.address}</p>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-zinc-100 dark:bg-white/[0.05] border-t border-zinc-100 dark:border-white/[0.05]">
        <StatCell
          icon={<FileText className="h-4 w-4 text-amber-500" />}
          label="Khoản vay"
          value={`${summary.activeLoans}/${summary.totalLoans}`}
          sub="hoạt động"
        />
        <StatCell
          icon={<Banknote className="h-4 w-4 text-orange-500" />}
          label="Tổng dư nợ"
          value={fmtVND(summary.outstandingBalance)}
        />
        <StatCell
          icon={<Wallet className={`h-4 w-4 ${dg.icon}`} />}
          label="Nhóm nợ"
          value={summary.debtGroup ? `Nhóm ${summary.debtGroup}` : "—"}
          valueClass={dg.text}
        />
        <StatCell
          icon={<Shield className="h-4 w-4 text-blue-500" />}
          label="Tổng TSBĐ"
          value={summary.totalCollateralValue > 0 ? fmtVND(summary.totalCollateralValue) : "—"}
        />
        <StatCell
          icon={<Shield className="h-4 w-4 text-amber-500" />}
          label="Tổng NVBĐ"
          value={summary.totalObligation > 0 ? fmtVND(summary.totalObligation) : "—"}
        />
      </div>
    </div>
  );
}

function StatCell({ icon, label, value, sub, valueClass }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; valueClass?: string;
}) {
  return (
    <div className="bg-white dark:bg-[#161616] px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[11px] text-zinc-400 dark:text-slate-500">{label}</span>
      </div>
      <p className={`text-sm font-semibold tabular-nums ${valueClass ?? "text-zinc-800 dark:text-slate-200"}`}>{value}</p>
      {sub && <p className="text-[10px] text-zinc-400 dark:text-slate-500">{sub}</p>}
    </div>
  );
}

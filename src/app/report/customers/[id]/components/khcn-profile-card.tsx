"use client";

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
  };
};

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount);
}

/** Color for debt group badge: 1=green, 2=yellow, 3-5=red */
function debtGroupColor(group: string | null) {
  if (!group) return "text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400";
  const n = Number(group);
  if (n <= 1) return "text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400";
  if (n === 2) return "text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400";
  return "text-red-700 bg-red-50 dark:bg-red-500/10 dark:text-red-400";
}

/** Check if maturity date is within 30 days */
function isNearMaturity(isoDate: string | null): boolean {
  if (!isoDate) return false;
  const diff = new Date(isoDate).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("vi-VN");
}

export function KhcnProfileCard({ customer, summary }: KhcnProfileCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4 shadow-sm space-y-3">
      {/* Row 1: Identity info */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <h3 className="text-base font-bold text-zinc-900 dark:text-slate-100">
          {customer.customer_name}
        </h3>
        <InfoChip label="CIF" value={customer.customer_code} />
        {customer.cccd && <InfoChip label="CCCD" value={customer.cccd} />}
        {customer.phone && <InfoChip label="SĐT" value={customer.phone} />}
      </div>

      {/* Row 2: Address */}
      {customer.address && (
        <p className="text-sm text-zinc-500 dark:text-slate-400">{customer.address}</p>
      )}

      {/* Row 3: Key stats */}
      <div className="flex flex-wrap gap-3">
        <StatBadge label="Khoản vay" value={`${summary.activeLoans}/${summary.totalLoans}`} sub="hoạt động" />
        <StatBadge label="Tổng vay HĐ" value={`${formatVND(summary.outstandingBalance)} đ`} />
        <StatBadge
          label="Nhóm nợ"
          value={summary.debtGroup ?? "—"}
          className={debtGroupColor(summary.debtGroup)}
        />
        <StatBadge
          label="Hạn đáo"
          value={formatDate(summary.nearestMaturity)}
          className={isNearMaturity(summary.nearestMaturity) ? "text-red-700 bg-red-50 dark:bg-red-500/10 dark:text-red-400" : undefined}
        />
        <StatBadge
          label="Đồng vay"
          value={summary.coBorrowerCount > 0 ? "Có" : "Không"}
          className={summary.coBorrowerCount > 0 ? "text-blue-700 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400" : undefined}
        />
      </div>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-sm text-zinc-600 dark:text-slate-300">
      <span className="text-zinc-400 dark:text-slate-500">{label}:</span> {value}
    </span>
  );
}

function StatBadge({ label, value, sub, className }: { label: string; value: string; sub?: string; className?: string }) {
  return (
    <div className={`rounded-lg border border-zinc-200/60 dark:border-white/[0.06] px-3 py-1.5 text-sm ${className ?? "bg-zinc-50 dark:bg-white/[0.04] text-zinc-700 dark:text-slate-300"}`}>
      <span className="text-xs text-zinc-400 dark:text-slate-500">{label}</span>
      <div className="font-semibold tabular-nums">{value}</div>
      {sub && <span className="text-[10px] text-zinc-400 dark:text-slate-500">{sub}</span>}
    </div>
  );
}

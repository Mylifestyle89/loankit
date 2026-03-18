"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Banknote, ChevronDown, ChevronRight, Clock, Eye, FileText, Layers, XCircle } from "lucide-react";
import Link from "next/link";

import { useLanguage } from "@/components/language-provider";
import { InvoiceTable } from "@/components/invoice-tracking/invoice-table";
import { fmtDisplay as fmt } from "@/lib/invoice-tracking-format-helpers";
import { CustomerSummaryCards } from "@/components/invoice-tracking/customer-summary-cards";
import { useCustomerStore } from "@/stores/use-customer-store";
import { useCustomerData } from "@/hooks/use-customer-data";
import { InvoiceFormModal } from "@/components/invoice-tracking/invoice-form-modal";

type SummaryItem = {
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
  totalLoans: number;
  totalDisbursements: number;
  totalInvoices: number;
  totalAmount: number;
  pendingCount: number;
  overdueCount: number;
  needsSupplementCount: number;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  customDeadline?: string | null;
  status: string;
  notes?: string | null;
  disbursementId?: string;
  disbursementBeneficiaryId?: string;
  disbursementBeneficiary?: { amount: number; invoiceAmount: number } | null;
  disbursement?: {
    id: string;
    amount: number;
    disbursementDate?: string;
    loan?: { contractNumber: string; customer?: { customer_name: string } };
  };
};

type GroupedDisbursement = {
  disbursementId: string;
  disbursementAmount: number;
  disbursementDate: string;
  contractNumber: string;
  customerName: string;
  invoices: Invoice[];
  totalInvoiceAmount: number;
};

export default function InvoicesOverviewPage() {
  const { t } = useLanguage();
  const storeCustomerId = useCustomerStore((s) => s.selectedCustomerId);
  const { customers: storeCustomers } = useCustomerData();
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [supplementTarget, setSupplementTarget] = useState<{ disbursementId: string; lineId: string; name: string; amount: number } | null>(null);
  // Map store customers to local type (add email from summary if available)
  const customers = storeCustomers as Array<{ id: string; customer_name: string; email?: string | null }>;
  const [statusFilter, setStatusFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [groupBy, setGroupBy] = useState<"none" | "disbursement">("none");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Sync store -> local filter
  useEffect(() => {
    setCustomerFilter(storeCustomerId);
  }, [storeCustomerId]);

  useEffect(() => {
    fetch("/api/invoices/summary").then((r) => r.json()).then((d) => {
      if (d.ok) setSummary(d.summary ?? []);
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (customerFilter) params.set("customerId", customerFilter);
    const qs = params.toString() ? `?${params}` : "";

    const [invRes, sumRes] = await Promise.all([
      fetch(`/api/invoices${qs}`, { cache: "no-store" }),
      fetch("/api/invoices/summary", { cache: "no-store" }),
    ]);
    const [invData, sumData] = await Promise.all([invRes.json(), sumRes.json()]);
    if (invData.ok) setInvoices(invData.invoices ?? []);
    if (sumData.ok) setSummary(sumData.summary ?? []);
    setLoading(false);
  }, [statusFilter, customerFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleMarkPaid(invoiceId: string) {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Cập nhật trạng thái thất bại");
      }
    } catch {
      alert("Lỗi kết nối. Vui lòng thử lại.");
    }
    void loadData();
  }

  // Group invoices by disbursement for grouped view
  const groupedByDisbursement = useMemo((): GroupedDisbursement[] => {
    const map = new Map<string, GroupedDisbursement>();
    for (const inv of invoices) {
      const dId = inv.disbursementId ?? inv.disbursement?.id ?? "unknown";
      if (!map.has(dId)) {
        map.set(dId, {
          disbursementId: dId,
          disbursementAmount: inv.disbursement?.amount ?? 0,
          disbursementDate: inv.disbursement?.disbursementDate ?? inv.issueDate,
          contractNumber: inv.disbursement?.loan?.contractNumber ?? "—",
          customerName: inv.disbursement?.loan?.customer?.customer_name ?? "—",
          invoices: [],
          totalInvoiceAmount: 0,
        });
      }
      const g = map.get(dId)!;
      g.invoices.push(inv);
      // Only count real invoices (not virtual "needs_supplement" entries)
      if (!inv.id.startsWith("virtual-")) {
        g.totalInvoiceAmount += inv.amount;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.disbursementDate.localeCompare(a.disbursementDate));
  }, [invoices]);

  function toggleGroup(id: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSupplement(inv: Invoice) {
    const dId = inv.disbursementId ?? inv.disbursement?.id;
    if (dId && inv.disbursementBeneficiaryId) {
      setSupplementTarget({
        disbursementId: dId,
        lineId: inv.disbursementBeneficiaryId,
        name: inv.supplierName,
        amount: inv.amount,
      });
    }
  }

  const totalPending = summary.reduce((s, c) => s + c.pendingCount, 0);
  const totalOverdue = summary.reduce((s, c) => s + c.overdueCount, 0);
  const totalAmount = summary.reduce((s, c) => s + c.totalAmount, 0);
  const totalNeedsSupplement = summary.reduce((s, c) => s + c.needsSupplementCount, 0);

  return (
    <section className="space-y-5">
      {/* Header with gradient accent */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-100 dark:border-violet-500/10 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-950/30 dark:via-[#141414] dark:to-fuchsia-950/20 p-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/30 blur-2xl dark:bg-violet-500/10" />
        <div className="relative">
          <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
            {t("invoices.title")}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">{t("invoices.desc")}</p>
        </div>

        {/* Summary stats */}
        <div className="relative mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {totalNeedsSupplement > 0 && (
            <div className="flex items-center gap-2.5 rounded-xl border border-orange-200/60 dark:border-orange-500/15 bg-white/60 dark:bg-white/[0.04] p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-500/15">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 dark:text-slate-500">{t("invoices.needsSupplement")}</p>
                <p className="font-semibold tabular-nums text-orange-700 dark:text-orange-300">{totalNeedsSupplement}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-200/60 dark:border-amber-500/15 bg-white/60 dark:bg-white/[0.04] p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/15">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 dark:text-slate-500">{t("invoices.totalPending")}</p>
              <p className="font-semibold tabular-nums">{totalPending}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-red-200/60 dark:border-red-500/15 bg-white/60 dark:bg-white/[0.04] p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-500/15">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 dark:text-slate-500">{t("invoices.totalOverdue")}</p>
              <p className="font-semibold tabular-nums text-red-700 dark:text-red-300">{totalOverdue}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-violet-200/60 dark:border-violet-500/15 bg-white/60 dark:bg-white/[0.04] p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/15">
              <Banknote className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 dark:text-slate-500">{t("invoices.totalAmount")}</p>
              <p className="font-semibold tabular-nums bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">{fmt(totalAmount)} VND</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer summary cards */}
      {summary.filter((s) => s.totalInvoices > 0 || s.needsSupplementCount > 0).length > 0 && (
        <CustomerSummaryCards
          customers={summary.filter((s) => s.totalInvoices > 0 || s.needsSupplementCount > 0)}
          selectedCustomerId={customerFilter}
          onSelectCustomer={setCustomerFilter}
          onEmailUpdated={loadData}
        />
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="cursor-pointer rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
          <option value="">{t("invoices.all")}</option>
          <option value="needs_supplement">{t("invoices.status.needs_supplement")}</option>
          <option value="pending">{t("invoices.status.pending")}</option>
          <option value="paid">{t("invoices.status.paid")}</option>
          <option value="overdue">{t("invoices.status.overdue")}</option>
        </select>
        <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}
          className="cursor-pointer rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
          <option value="">{t("invoices.filterCustomer")}</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
        </select>
        {/* Group-by toggle */}
        <button
          type="button"
          onClick={() => setGroupBy((g) => g === "none" ? "disbursement" : "none")}
          className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 ${
            groupBy === "disbursement"
              ? "border-violet-300 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400"
              : "border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] text-zinc-600 dark:text-slate-400 hover:border-violet-200 dark:hover:border-violet-500/20"
          }`}
        >
          <Layers className="h-4 w-4" />
          Nhóm theo giải ngân
        </button>
      </div>

      {/* Invoice table / grouped view */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] shadow-sm overflow-hidden">
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600 dark:border-violet-800 dark:border-t-violet-400" />
          </div>
        </div>
      ) : groupBy === "disbursement" ? (
        /* Grouped by disbursement */
        <div className="space-y-3">
          {groupedByDisbursement.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-12 text-center">
              <p className="text-sm text-zinc-400 dark:text-slate-500">Không có hóa đơn nào.</p>
            </div>
          ) : groupedByDisbursement.map((g) => {
            const isCollapsed = collapsedGroups.has(g.disbursementId);
            const remaining = Math.max(0, g.disbursementAmount - g.totalInvoiceAmount);
            const pct = g.disbursementAmount > 0 ? Math.min(100, Math.round((g.totalInvoiceAmount / g.disbursementAmount) * 100)) : 0;
            const isFull = pct >= 100;
            return (
              <div key={g.disbursementId} className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] shadow-sm overflow-hidden">
                {/* Group header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(g.disbursementId)}
                  className="cursor-pointer w-full px-5 py-4 text-left hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {/* Row 1: contract info + badge */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {isCollapsed ? <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-violet-500 shrink-0" />}
                      <span className="text-sm font-semibold text-zinc-800 dark:text-slate-200 truncate">{g.contractNumber}</span>
                      <span className="hidden sm:inline text-xs text-zinc-400 dark:text-slate-500 truncate">{g.customerName}</span>
                      <span className="text-xs text-zinc-400 dark:text-slate-500">• {new Date(g.disbursementDate).toLocaleDateString("vi-VN")}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${isFull ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"}`}>
                        {pct}%
                      </span>
                      <span className="text-xs text-zinc-400 dark:text-slate-500">{g.invoices.length} HĐ</span>
                      <Link
                        href={`/report/disbursements/${g.disbursementId}`}
                        onClick={(e) => e.stopPropagation()}
                        title="Quản lý giải ngân"
                        className="cursor-pointer rounded-lg p-1.5 text-zinc-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:text-violet-400 dark:hover:bg-violet-500/10 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                  {/* Row 2: progress bar + amounts */}
                  <div className="mt-2.5 ml-6 space-y-1.5">
                    <div className="h-2 rounded-full bg-zinc-100 dark:bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isFull ? "bg-emerald-500" : pct > 50 ? "bg-violet-500" : "bg-amber-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs tabular-nums">
                      <span className="text-zinc-500 dark:text-slate-400">
                        Đã bổ sung: <span className="font-medium text-zinc-700 dark:text-slate-300">{fmt(g.totalInvoiceAmount)}</span>
                        <span className="text-zinc-400 dark:text-slate-500"> / {fmt(g.disbursementAmount)}</span>
                      </span>
                      {remaining > 0 && (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          Còn thiếu: {fmt(remaining)}
                        </span>
                      )}
                      {isFull && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Đã đủ
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                {/* Group invoices */}
                {!isCollapsed && (
                  <InvoiceTable
                    invoices={g.invoices}
                    onMarkPaid={handleMarkPaid}
                    onSupplement={handleSupplement}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat list */
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] shadow-sm overflow-hidden">
          <InvoiceTable
            invoices={invoices}
            onMarkPaid={handleMarkPaid}
            onSupplement={handleSupplement}
          />
        </div>
      )}

      {/* Add invoice modal (supplement flow) */}
      {supplementTarget && (
        <InvoiceFormModal
          disbursementId={supplementTarget.disbursementId}
          beneficiaryLineId={supplementTarget.lineId}
          beneficiaryName={supplementTarget.name}
          defaultAmount={supplementTarget.amount}
          onClose={() => setSupplementTarget(null)}
          onCreated={() => { setSupplementTarget(null); void loadData(); }}
        />
      )}
    </section>
  );
}

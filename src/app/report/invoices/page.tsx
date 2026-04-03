"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Banknote, Clock, XCircle } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { InvoiceTable, isSelectable } from "@/components/invoice-tracking/invoice-table";
import { fmtDisplay as fmt } from "@/lib/invoice-tracking-format-helpers";
import { CustomerSummaryCards } from "@/components/invoice-tracking/customer-summary-cards";
import { useCustomerStore } from "@/stores/use-customer-store";
import { useCustomerData } from "@/hooks/use-customer-data";
import { InvoiceFormModal } from "@/components/invoice-tracking/invoice-form-modal";
import { InvoiceFiltersBar } from "./components/invoice-filters-bar";
import { InvoiceGroupedView, type GroupedDisbursement } from "./components/invoice-grouped-view";

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

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

  // Clear selection when filters change
  useEffect(() => { setSelectedIds(new Set()); }, [statusFilter, customerFilter]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const eligible = invoices.filter(isSelectable);
    const allSelected = eligible.every((inv) => selectedIds.has(inv.id));
    setSelectedIds(allSelected ? new Set() : new Set(eligible.map((inv) => inv.id)));
  }

  async function handleBulkMarkPaid() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/invoices/bulk-mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Cập nhật trạng thái thất bại");
      }
    } catch {
      alert("Lỗi kết nối. Vui lòng thử lại.");
    }
    setSelectedIds(new Set());
    setBulkLoading(false);
    void loadData();
  }

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

      {/* Filters + bulk toolbar */}
      <InvoiceFiltersBar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        customerFilter={customerFilter}
        onCustomerFilterChange={setCustomerFilter}
        customers={customers}
        groupBy={groupBy}
        onToggleGroupBy={() => setGroupBy((g) => g === "none" ? "disbursement" : "none")}
        selectedCount={selectedIds.size}
        bulkLoading={bulkLoading}
        onBulkMarkPaid={handleBulkMarkPaid}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {/* Invoice table / grouped view */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] shadow-sm overflow-hidden">
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600 dark:border-violet-800 dark:border-t-violet-400" />
          </div>
        </div>
      ) : groupBy === "disbursement" ? (
        /* Grouped by disbursement */
        <InvoiceGroupedView
          groups={groupedByDisbursement}
          collapsedGroups={collapsedGroups}
          onToggleGroup={toggleGroup}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onMarkPaid={handleMarkPaid}
          onSupplement={handleSupplement}
        />
      ) : (
        /* Flat list */
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] shadow-sm overflow-hidden">
          <InvoiceTable
            invoices={invoices}
            onMarkPaid={handleMarkPaid}
            onSupplement={handleSupplement}
            selectable
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
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

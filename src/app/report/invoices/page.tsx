"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Banknote, Bell, Clock, Download, XCircle } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { InvoiceTable } from "@/components/invoice-tracking/invoice-table";
import { fmtDisplay as fmt } from "@/lib/invoice-tracking-format-helpers";
import { CustomerSummaryCards } from "@/components/invoice-tracking/customer-summary-cards";
import { useCustomerStore } from "@/stores/use-customer-store";
import { useCustomerData } from "@/hooks/use-customer-data";
import { InvoiceFormModal } from "@/components/invoice-tracking/invoice-form-modal";
import { NotificationHistoryModal } from "@/components/invoice-tracking/notification-history-modal";
import { OverdueExportModal } from "@/components/invoice-tracking/overdue-export-modal";
import { CustomerEmailSettingsModal } from "@/components/invoice-tracking/customer-email-settings-modal";
import { useNotificationStore } from "@/components/invoice-tracking/use-notification-store";
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

import type { Invoice } from "./types";


export default function InvoicesOverviewPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const storeCustomerId = useCustomerStore((s) => s.selectedCustomerId);
  const { customers: storeCustomers } = useCustomerData();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [supplementTarget, setSupplementTarget] = useState<{ disbursementId: string; lineId: string; name: string; amount: number } | null>(null);
  // Map store customers to local type (add email from summary if available)
  const customers = storeCustomers as Array<{ id: string; customer_name: string; email?: string | null }>;
  const [statusFilter, setStatusFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [groupBy, setGroupBy] = useState<"none" | "disbursement">("none");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Auto-open notification history when redirected from notification panel
  useEffect(() => {
    if (searchParams.get("notifications") === "1") setShowNotifications(true);
  }, [searchParams]);

  // Sync store -> local filter
  useEffect(() => {
    setCustomerFilter(storeCustomerId);
  }, [storeCustomerId]);

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

  const activeSummary = useMemo(
    () => summary.filter((s) => s.totalInvoices > 0 || s.needsSupplementCount > 0),
    [summary],
  );
  const totalPending = summary.reduce((s, c) => s + c.pendingCount, 0);
  const totalOverdue = summary.reduce((s, c) => s + c.overdueCount, 0);
  const totalAmount = summary.reduce((s, c) => s + c.totalAmount, 0);
  const totalNeedsSupplement = summary.reduce((s, c) => s + c.needsSupplementCount, 0);

  return (
    <section className="space-y-5">
      {/* Header with gradient accent */}
      <div className="relative overflow-hidden rounded-2xl border border-primary-100 dark:border-primary-500/10 bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-primary-950/30 dark:via-[#242220] dark:to-primary-900/20 p-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-200/30 blur-2xl dark:bg-primary-500/10" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-primary-600 dark:text-primary-400">
              {t("invoices.title")}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">{t("invoices.desc")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setShowExportModal(true)}
              disabled={totalOverdue + totalNeedsSupplement + totalPending === 0}
              className="cursor-pointer flex items-center gap-2 rounded-xl border border-primary-200/60 dark:border-primary-500/20 bg-white/70 dark:bg-white/[0.05] px-3 py-2 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-3.5 w-3.5" />
              Tải danh sách nợ
            </button>
            <button
              onClick={() => setShowNotifications(true)}
              className="relative cursor-pointer flex items-center gap-2 rounded-xl border border-primary-200/60 dark:border-primary-500/20 bg-white/70 dark:bg-white/[0.05] px-3 py-2 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
            >
              <Bell className="h-3.5 w-3.5" />
              Thông báo đến hạn
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="relative mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {totalNeedsSupplement > 0 && (
            <div className="flex items-center gap-2.5 rounded-xl border border-primary-200/60 dark:border-primary-500/15 bg-white/60 dark:bg-white/[0.04] p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-500/15">
                <AlertTriangle className="h-4 w-4 text-primary-500 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 dark:text-slate-500">{t("invoices.needsSupplement")}</p>
                <p className="font-semibold tabular-nums text-primary-600 dark:text-primary-300">{totalNeedsSupplement}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2.5 rounded-xl border border-primary-200/60 dark:border-primary-500/15 bg-white/60 dark:bg-white/[0.04] p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-500/15">
              <Clock className="h-4 w-4 text-primary-500 dark:text-primary-400" />
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
          <div className="flex items-center gap-2.5 rounded-xl border border-primary-200/60 dark:border-primary-500/15 bg-white/60 dark:bg-white/[0.04] p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-500/15">
              <Banknote className="h-4 w-4 text-primary-500 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 dark:text-slate-500">{t("invoices.totalAmount")}</p>
              <p className="font-semibold tabular-nums text-primary-600 dark:text-primary-400">{fmt(totalAmount)} VND</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer summary cards */}
      {activeSummary.length > 0 && (
        <CustomerSummaryCards
          customers={activeSummary}
          selectedCustomerId={customerFilter}
          onSelectCustomer={setCustomerFilter}
          onOpenEmailSettings={() => setShowEmailSettings(true)}
        />
      )}

      {/* Filters */}
      <InvoiceFiltersBar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        customerFilter={customerFilter}
        onCustomerFilterChange={setCustomerFilter}
        customers={customers}
        groupBy={groupBy}
        onToggleGroupBy={() => setGroupBy((g) => g === "none" ? "disbursement" : "none")}
      />

      {/* Invoice table / grouped view */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] shadow-sm overflow-hidden">
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500 dark:border-primary-700 dark:border-t-primary-400" />
          </div>
        </div>
      ) : groupBy === "disbursement" ? (
        /* Grouped by disbursement */
        <InvoiceGroupedView
          groups={groupedByDisbursement}
          collapsedGroups={collapsedGroups}
          onToggleGroup={toggleGroup}
          onSupplement={handleSupplement}
        />
      ) : (
        /* Flat list */
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] shadow-sm overflow-hidden">
          <InvoiceTable
            invoices={invoices}
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

      {/* Notification history modal */}
      {showNotifications && (
        <NotificationHistoryModal onClose={() => setShowNotifications(false)} />
      )}

      {/* Overdue export modal */}
      {showExportModal && (
        <OverdueExportModal
          customers={summary.filter((s) => s.overdueCount + s.needsSupplementCount + s.pendingCount > 0)}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Email settings modal */}
      {showEmailSettings && (
        <CustomerEmailSettingsModal
          customers={summary}
          onClose={() => setShowEmailSettings(false)}
          onEmailUpdated={() => void loadData()}
        />
      )}
    </section>
  );
}

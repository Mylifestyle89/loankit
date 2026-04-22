"use client";

/**
 * invoice-filters-bar.tsx
 *
 * Filter controls for the invoices overview page:
 * status select, customer search combobox, group-by toggle, bulk-action toolbar.
 */

import { useEffect, useRef, useState } from "react";
import { Layers, Search, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

import type { Customer } from "../types";
type Props = {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  customerFilter: string;
  onCustomerFilterChange: (value: string) => void;
  customers: Customer[];
  groupBy: "none" | "disbursement";
  onToggleGroupBy: () => void;
};

function CustomerSearchInput({
  customers,
  value: selectedId,
  onChange,
}: {
  customers: Customer[];
  value: string;
  onChange: (id: string) => void;
}) {
  const selectedName = customers.find((c) => c.id === selectedId)?.customer_name ?? "";
  const [query, setQuery] = useState(selectedName);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync when external selection changes (e.g. chip click)
  useEffect(() => {
    setQuery(customers.find((c) => c.id === selectedId)?.customer_name ?? "");
  }, [selectedId, customers]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // Restore display name if user typed but didn't select
        setQuery(customers.find((c) => c.id === selectedId)?.customer_name ?? "");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [selectedId, customers]);

  const filtered = query.trim()
    ? customers.filter((c) => c.customer_name.toLowerCase().includes(query.toLowerCase()))
    : customers;

  function select(c: Customer) {
    onChange(c.id);
    setQuery(c.customer_name);
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 shadow-sm focus-within:border-brand-400 focus-within:ring-1 focus-within:ring-brand-500/40 transition-all">
        <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-slate-500" />
        <input
          type="text"
          value={query}
          placeholder="Tìm khách hàng..."
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-36 bg-transparent text-sm outline-none placeholder:text-zinc-400 dark:placeholder:text-slate-500"
        />
        {(query || selectedId) && (
          <button type="button" onClick={clear} className="cursor-pointer text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-300">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-56 w-56 overflow-y-auto rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] shadow-lg">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); select(c); }}
                className={`flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.05] ${
                  c.id === selectedId ? "font-medium text-brand-600 dark:text-brand-400" : "text-zinc-700 dark:text-slate-300"
                }`}
              >
                {c.customer_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function InvoiceFiltersBar({
  statusFilter,
  onStatusFilterChange,
  customerFilter,
  onCustomerFilterChange,
  customers,
  groupBy,
  onToggleGroupBy,
}: Props) {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      {/* Filter controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="cursor-pointer rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <option value="">{t("invoices.all")}</option>
          <option value="needs_supplement">{t("invoices.status.needs_supplement")}</option>
          <option value="pending">{t("invoices.status.pending")}</option>
          <option value="overdue">{t("invoices.status.overdue")}</option>
        </select>
        <CustomerSearchInput
          customers={customers}
          value={customerFilter}
          onChange={onCustomerFilterChange}
        />
        <button
          type="button"
          onClick={onToggleGroupBy}
          className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
            groupBy === "disbursement"
              ? "border-brand-300 dark:border-brand-500/30 bg-brand-100 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400"
              : "border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] text-zinc-600 dark:text-slate-400 hover:border-brand-200 dark:hover:border-brand-500/20"
          }`}
        >
          <Layers className="h-4 w-4" />
          Nhóm theo giải ngân
        </button>
      </div>
    </div>
  );
}

"use client";

import { User, X } from "lucide-react";
// framer-motion not needed here — static render based on expanded prop
import { useCustomerStore, useSelectedCustomer, useIsCustomerStoreHydrated } from "@/stores/use-customer-store";

/** Sidebar widget showing the currently selected customer. */
export function CustomerContextIndicator({ expanded }: { expanded: boolean }) {
  const customer = useSelectedCustomer();
  const hydrated = useIsCustomerStoreHydrated();
  const clear = useCustomerStore((s) => s.setSelectedCustomerId);

  if (!hydrated || !customer) return null;

  return (
    <div
      className={`mx-1.5 mb-1 rounded-lg border border-brand-200 dark:border-brand-500/20
        bg-brand-100 dark:bg-brand-500/10 ${expanded ? "px-2.5 py-2" : "py-2 px-1"}`}
    >
      {expanded ? (
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 shrink-0 text-brand-500 dark:text-brand-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-brand-600 dark:text-brand-300">
              {customer.customer_name}
            </p>
            <p className="truncate text-[10px] text-brand-500 dark:text-brand-400/70">
              {customer.customer_code}
            </p>
          </div>
          <button
            type="button"
            onClick={() => clear("")}
            title="Bỏ chọn khách hàng"
            className="shrink-0 rounded p-0.5 hover:bg-brand-200 dark:hover:bg-brand-500/20 transition-colors"
          >
            <X className="h-3 w-3 text-brand-500" />
          </button>
        </div>
      ) : (
        <div className="flex justify-center" title={customer.customer_name}>
          <User className="h-4 w-4 text-brand-500 dark:text-brand-400" />
        </div>
      )}
    </div>
  );
}

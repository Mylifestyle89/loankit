"use client";

import { useEffect } from "react";
import { useCustomerStore } from "@/stores/use-customer-store";

/**
 * Fetches customer list into the shared store if not already loaded.
 * Call this in any page/component that needs customer data.
 * Prevents redundant API calls across tabs.
 */
export function useCustomerData() {
  const customers = useCustomerStore((s) => s.customers);
  const loading = useCustomerStore((s) => s.loadingCustomers);
  const setCustomers = useCustomerStore((s) => s.setCustomers);
  const setLoading = useCustomerStore((s) => s.setLoadingCustomers);

  useEffect(() => {
    if (customers.length > 0 || loading) return;
    setLoading(true);
    fetch("/api/customers")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setCustomers(d.customers ?? []);
      })
      .catch(() => {
        // Network or parse error — silently fail, customers stay empty
        // Next navigation will retry via customers.length === 0 check
      })
      .finally(() => setLoading(false));
  }, [customers.length, loading, setCustomers, setLoading]);

  return { customers, loading };
}

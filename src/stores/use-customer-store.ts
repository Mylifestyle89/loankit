"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Customer = { id: string; customer_name: string; customer_code: string; customer_type?: string };

type CustomerState = {
  customers: Customer[];
  loadingCustomers: boolean;
  selectedCustomerId: string;
  /** True once Zustand has finished reading from localStorage (Next.js SSR-safe). */
  _hasHydrated: boolean;
  setCustomers: (customers: Customer[]) => void;
  setLoadingCustomers: (loading: boolean) => void;
  setSelectedCustomerId: (id: string) => void;
  reset: () => void;
  _setHasHydrated: (v: boolean) => void;
};

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set) => ({
      customers: [],
      loadingCustomers: false,
      selectedCustomerId: "",
      _hasHydrated: false,
      setCustomers: (customers) => set({ customers }),
      setLoadingCustomers: (loadingCustomers) => set({ loadingCustomers }),
      setSelectedCustomerId: (selectedCustomerId) => set({ selectedCustomerId }),
      reset: () => set({ customers: [], loadingCustomers: false, selectedCustomerId: "" }),
      _setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "selected-customer",
      // Only persist the selected ID — the customer list is always re-fetched from the API
      partialize: (s) => ({ selectedCustomerId: s.selectedCustomerId }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    },
  ),
);

/** True after Zustand has finished reading from localStorage. Prevents SSR hydration mismatch. */
export function useIsCustomerStoreHydrated(): boolean {
  return useCustomerStore((s) => s._hasHydrated);
}

/**
 * Returns the currently selected Customer object.
 * Returns null when:
 * 1. Store hasn't hydrated from localStorage yet.
 * 2. No customer is selected (empty ID).
 * 3. The selected ID is not found in the loaded customer list.
 */
export function useSelectedCustomer(): Customer | null {
  const customers = useCustomerStore((s) => s.customers);
  const isHydrated = useIsCustomerStoreHydrated();
  const selectedId = useCustomerStore((s) => s.selectedCustomerId);

  return useMemo(() => {
    if (!isHydrated || !selectedId) return null;
    return customers.find((c) => c.id === selectedId) ?? null;
  }, [customers, isHydrated, selectedId]);
}

// Re-export from shared location — all mapping imports still work
export {
  useCustomerStore,
  useIsCustomerStoreHydrated,
  useSelectedCustomer,
} from "@/stores/use-customer-store";
export type { Customer } from "@/stores/use-customer-store";

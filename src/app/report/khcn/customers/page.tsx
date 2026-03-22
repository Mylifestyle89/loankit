"use client";
import { CustomerListView } from "@/components/customers/customer-list-view";
export default function KhcnCustomersPage() {
  return <CustomerListView customerType="individual" basePath="/report/khcn/customers" />;
}

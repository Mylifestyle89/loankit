"use client";
import { CustomerListView } from "@/components/customers/customer-list-view";
export default function KhdnCustomersPage() {
  return <CustomerListView customerType="corporate" basePath="/report/khdn/customers" showSelect />;
}

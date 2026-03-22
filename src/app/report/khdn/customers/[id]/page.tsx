"use client";
import { CustomerDetailView } from "@/components/customers/customer-detail-view";
export default function KhdnCustomerDetailPage() {
  return <CustomerDetailView customerType="corporate" basePath="/report/khdn/customers" />;
}

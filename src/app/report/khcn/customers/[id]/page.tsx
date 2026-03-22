"use client";
import { CustomerDetailView } from "@/components/customers/customer-detail-view";
export default function KhcnCustomerDetailPage() {
  return <CustomerDetailView customerType="individual" basePath="/report/khcn/customers" />;
}

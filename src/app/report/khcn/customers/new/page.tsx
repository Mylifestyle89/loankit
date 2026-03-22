"use client";
import { CustomerNewForm } from "@/components/customers/customer-new-form";
export default function KhcnNewCustomerPage() {
  return <CustomerNewForm customerType="individual" basePath="/report/khcn/customers" />;
}

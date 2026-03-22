"use client";
import { CustomerNewForm } from "@/components/customers/customer-new-form";
export default function KhdnNewCustomerPage() {
  return <CustomerNewForm customerType="corporate" basePath="/report/khdn/customers" />;
}

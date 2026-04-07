"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirect old /report/customers/new to /report/khdn/customers/new */
export default function NewCustomerRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/report/khdn/customers/new"); }, [router]);
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
    </div>
  );
}

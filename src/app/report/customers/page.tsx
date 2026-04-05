"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirect old /report/customers to /report/khdn/customers */
export default function CustomersRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/report/khdn/customers"); }, [router]);
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-200 border-t-amber-600" />
    </div>
  );
}

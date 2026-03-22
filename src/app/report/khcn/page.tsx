"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirect /report/khcn to /report/khcn/customers */
export default function KhcnRootPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/report/khcn/customers"); }, [router]);
  return null;
}
